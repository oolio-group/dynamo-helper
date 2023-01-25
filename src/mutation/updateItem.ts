import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AnyObject, FilterOperators, TableConfig } from '../types';
import { keyOperatorLookup } from '../query/queryBuilder';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError } from 'aws-sdk';

interface ConditionExpressionItem {
  key: string;
  comparator: FilterOperators;
  value: string | number | boolean | Array<number>;
}

interface AndOrExpression {
  andOr: 'AND' | 'OR';
}

export type ConditionExpressionInput = Array<
  ConditionExpressionItem | AndOrExpression
>;

interface ConditionExpressionReturn {
  expression: DocumentClient.ConditionExpression;
  attrValues: DocumentClient.ExpressionAttributeValueMap;
}

const buildConditionExpressions = (
  conditionExpression: ConditionExpressionInput,
): ConditionExpressionReturn => {
  let expression = '';
  const attrValues: DocumentClient.ExpressionAttributeValueMap = {};
  for (let i = 0; i < conditionExpression.length; i++) {
    const currentExpression = conditionExpression[i];
    if ('andOr' in currentExpression) {
      if (i > 0) {
        expression += ` ${currentExpression.andOr} `;
      }
      continue;
    }
    if (
      !('key' in currentExpression) ||
      !('comparator' in currentExpression) ||
      !('value' in currentExpression)
    ) {
      continue;
    }

    const key = currentExpression.key;
    const comparator = currentExpression.comparator;
    const value = currentExpression.value;

    if (!comparator) continue;
    const operator = keyOperatorLookup[comparator];
    if (operator === 'BETWEEN') {
      expression += `${key} ${operator} :val${i}_1 AND :val${i}_2`;
      attrValues[`:val${i}_1`] = { N: value[0].toString() };
      attrValues[`:val${i}_2`] = { N: value[1].toString() };
    } else {
      expression += `${key} ${operator} :val${i}`;
      attrValues[`:val${i}`] = { N: value.toString() };
    }
  }
  return { expression, attrValues };
};

/**
 * Update item in database conditionally.
 *
 * @param dbClient
 * @param table
 * @param key
 * @param conditions
 * @param item
 * @returns
 */
export async function updateItem<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  key: DocumentClient.Key,
  conditions: ConditionExpressionInput,
  item: T,
): Promise<PromiseResult<DocumentClient.PutItemOutput, AWSError>> {
  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  const { expression, attrValues } = buildConditionExpressions(conditions);

  const updateExpressionString = Object.keys(item)
    .map(attribute => `${attribute} = :${item[attribute]}`)
    .join(', ');

  const params: DocumentClient.UpdateItemInput = {
    TableName: table.name,
    Key: key,
    UpdateExpression: `SET ${updateExpressionString}`,
    ConditionExpression: expression,
    ExpressionAttributeValues: attrValues,
  };
  console.log(params);

  return dbClient.update(params).promise();
}

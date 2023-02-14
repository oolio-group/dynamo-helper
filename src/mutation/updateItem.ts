import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
  AnyObject,
  ConditionExpressionInput,
  ConditionExpressionKind,
  ConditionExpressionReturn,
  TableConfig,
} from '../types';
import { keyOperatorLookup } from '../query/queryBuilder';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError } from 'aws-sdk';
import { marshall } from '@aws-sdk/util-dynamodb';

const buildConditionExpressions = (
  conditionExpression: ConditionExpressionInput[],
): ConditionExpressionReturn => {
  let expression = '';
  const attrValues: DocumentClient.ExpressionAttributeValueMap = {};
  for (let i = 0; i < conditionExpression.length; i++) {
    const currentExpression = conditionExpression[i];
    if (currentExpression.kind === ConditionExpressionKind.AndOr) {
      if (i > 0) {
        expression += ` ${currentExpression.value} `;
      }
      continue;
    }
    if (currentExpression.kind === ConditionExpressionKind.Comparison) {
      const key = currentExpression.key;
      const comparator = currentExpression.comparator;
      const value = currentExpression.value;

      if (!comparator) continue;
      const operator = keyOperatorLookup[comparator];
      if (operator === 'BETWEEN') {
        expression += `${key} ${operator} :val${i}_1 AND :val${i}_2`;
        attrValues[`:val${i}_1`] = marshall(value[0]);
        attrValues[`:val${i}_2`] = marshall(value[1]);
      } else {
        expression += `${key} ${operator} :val${i}`;
        attrValues[`:val${i}`] = marshall(value);
      }
    }
  }
  return { expression, attrValues };
};

const buildUpdateExpressions = (item: object) => {
  const expressions = [];
  const expressionValues = {};

  Object.keys(item)?.forEach(key => {
    expressions.push(`${key} = :${key}`);
    expressionValues[`:${key}`] = marshall(item[key]); // convert to dynamoDB object
  });

  return {
    updateExpressionString: `SET ${expressions.join(', ')}`,
    updateExpressionValues: expressionValues,
  };
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
  conditions: ConditionExpressionInput[],
  item: T,
): Promise<PromiseResult<DocumentClient.UpdateItemOutput, AWSError>> {
  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  const { expression, attrValues } = buildConditionExpressions(conditions);

  const {
    updateExpressionString,
    updateExpressionValues,
  } = buildUpdateExpressions(item);

  const params: DocumentClient.UpdateItemInput = {
    TableName: table.name,
    Key: key,
    ConditionExpression: expression,
    UpdateExpression: updateExpressionString,
    ExpressionAttributeValues:
      // merge condition and update expressions' values
      Object.assign({}, attrValues, updateExpressionValues),
  };

  return dbClient.update(params).promise();
}

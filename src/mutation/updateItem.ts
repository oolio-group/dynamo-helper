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

const buildConditionExpressions = (
  conditionExpression: ConditionExpressionInput[],
): ConditionExpressionReturn => {
  let expression = '';
  const attrValues: DocumentClient.ExpressionAttributeValueMap = {};
  const attrNames: DocumentClient.ExpressionAttributeNameMap = {};
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
      const operator = keyOperatorLookup(comparator);
      const expressionName = `#key_${key}`;
      attrNames[expressionName] = key;

      if (operator === 'BETWEEN') {
        expression += `${expressionName} ${operator} :val${i}_1 AND :val${i}_2`;
        attrValues[`:val${i}_1`] = value[0];
        attrValues[`:val${i}_2`] = value[1];
      } else {
        expression += `${expressionName} ${operator} :val${i}`;
        attrValues[`:val${i}`] = value;
      }
    }
  }
  return { expression, attrValues, attrNames };
};

const buildUpdateExpressions = (item: object): ConditionExpressionReturn => {
  const expressions = [];
  const expressionValues = {};
  const expressionNames = {};

  Object.keys(item)?.forEach(key => {
    expressions.push(`#key_${key} = :val_${key}`);
    expressionNames[`#key_${key}`] = key;
    expressionValues[`:val_${key}`] = item[key];
  });

  return {
    expression: `SET ${expressions.join(', ')}`,
    attrValues: expressionValues,
    attrNames: expressionNames,
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

  const conditionExpr = buildConditionExpressions(conditions);

  // exclude table keys from update expression
  const obj = Object.assign({}, item);
  delete obj[table.indexes.default.partitionKeyName];
  delete obj[table.indexes.default.sortKeyName];
  const updateExpr = buildUpdateExpressions(obj);

  const params: DocumentClient.UpdateItemInput = {
    TableName: table.name,
    Key: key,
    ConditionExpression: conditionExpr.expression,
    UpdateExpression: updateExpr.expression,
    ExpressionAttributeNames:
      // merge condition and update expressions' names
      Object.assign({}, conditionExpr.attrNames, updateExpr.attrNames),
    ExpressionAttributeValues:
      // merge condition and update expressions' values
      Object.assign({}, conditionExpr.attrValues, updateExpr.attrValues),
  };

  return dbClient.update(params).promise();
}

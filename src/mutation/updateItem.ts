import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandInput, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import {
  AnyObject,
  ConditionExpressionInput,
  TableConfig,
  Key,
} from '../types';
import { buildConditionExpressions, buildUpdateExpressions } from './expressionBuilder';

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
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  key: Key,
  conditions: ConditionExpressionInput[],
  item: T,
): Promise<UpdateCommandOutput> {
  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  const conditionExpr = buildConditionExpressions(conditions);

  // exclude table keys from update expression
  const obj = Object.assign({}, item);
  delete obj[table.indexes.default.partitionKeyName];
  delete obj[table.indexes.default.sortKeyName];
  const updateExpr = buildUpdateExpressions(obj);

  const params: UpdateCommandInput = {
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

  return dbClient.send(new UpdateCommand(params));
}

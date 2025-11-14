import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandOutput, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { AnyObject, TableConfig, Key, ConditionExpressionInput } from '../types';
import { buildConditionExpressions, buildUpdateExpressions } from './expressionBuilder';

/**
 * Transaction item types
 */
export interface TransactPutItem {
  Put: {
    Item: AnyObject;
    conditions?: ConditionExpressionInput[];
  };
}

export interface TransactDeleteItem {
  Delete: {
    Key: Key;
    conditions?: ConditionExpressionInput[];
  };
}

export interface TransactUpdateItem {
  Update: {
    Key: Key;
    Item: AnyObject;
    conditions?: ConditionExpressionInput[];
  };
}

export interface TransactConditionCheckItem {
  ConditionCheck: {
    Key: Key;
    conditions: ConditionExpressionInput[];
  };
}

export type TransactWriteItem =
  | TransactPutItem
  | TransactDeleteItem
  | TransactUpdateItem
  | TransactConditionCheckItem;

/**
 * Execute multiple write operations in a transaction
 * All operations must succeed or the entire transaction fails
 * @param transactItems Array of transaction items (Put, Delete, Update, or ConditionCheck)
 */
export function transactWriteItems(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  transactItems: Array<TransactWriteItem>,
): Promise<TransactWriteCommandOutput> {
  // Build transaction items with proper expressions
  const itemsWithExpressions = transactItems.map(item => {
    if ('Put' in item) {
      const putItem: Record<string, unknown> = {
        TableName: table.name,
        Item: item.Put.Item,
      };

      if (item.Put.conditions && item.Put.conditions.length > 0) {
        const conditionExpr = buildConditionExpressions(item.Put.conditions);
        putItem.ConditionExpression = conditionExpr.expression;
        putItem.ExpressionAttributeNames = conditionExpr.attrNames;
        putItem.ExpressionAttributeValues = conditionExpr.attrValues;
      }

      return { Put: putItem };
    }

    if ('Delete' in item) {
      const deleteItem: Record<string, unknown> = {
        TableName: table.name,
        Key: item.Delete.Key,
      };

      if (item.Delete.conditions && item.Delete.conditions.length > 0) {
        const conditionExpr = buildConditionExpressions(item.Delete.conditions);
        deleteItem.ConditionExpression = conditionExpr.expression;
        deleteItem.ExpressionAttributeNames = conditionExpr.attrNames;
        deleteItem.ExpressionAttributeValues = conditionExpr.attrValues;
      }

      return { Delete: deleteItem };
    }

    if ('Update' in item) {
      const updateItem: Record<string, unknown> = {
        TableName: table.name,
        Key: item.Update.Key,
      };

      // Build update expression from Item
      const obj = Object.assign({}, item.Update.Item);
      delete obj[table.indexes.default.partitionKeyName];
      delete obj[table.indexes.default.sortKeyName];
      const updateExpr = buildUpdateExpressions(obj);

      updateItem.UpdateExpression = updateExpr.expression;
      updateItem.ExpressionAttributeNames = updateExpr.attrNames;
      updateItem.ExpressionAttributeValues = updateExpr.attrValues;

      if (item.Update.conditions && item.Update.conditions.length > 0) {
        const conditionExpr = buildConditionExpressions(item.Update.conditions);
        updateItem.ConditionExpression = conditionExpr.expression;
        // Merge expression attribute names and values
        updateItem.ExpressionAttributeNames = Object.assign(
          {},
          updateExpr.attrNames,
          conditionExpr.attrNames
        );
        updateItem.ExpressionAttributeValues = Object.assign(
          {},
          updateExpr.attrValues,
          conditionExpr.attrValues
        );
      }

      return { Update: updateItem };
    }

    if ('ConditionCheck' in item) {
      const conditionExpr = buildConditionExpressions(item.ConditionCheck.conditions);

      return {
        ConditionCheck: {
          TableName: table.name,
          Key: item.ConditionCheck.Key,
          ConditionExpression: conditionExpr.expression,
          ExpressionAttributeNames: conditionExpr.attrNames,
          ExpressionAttributeValues: conditionExpr.attrValues,
        },
      };
    }

    return item;
  });

  return dbClient.send(new TransactWriteCommand({
    TransactItems: itemsWithExpressions,
  } as TransactWriteCommandInput));
}

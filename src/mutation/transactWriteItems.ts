import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandOutput, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { AnyObject, TableConfig, Key } from '../types';

/**
 * Transaction item types
 */
export interface TransactPutItem {
  Put: {
    Item: AnyObject;
    TableName?: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
  };
}

export interface TransactDeleteItem {
  Delete: {
    Key: Key;
    TableName?: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
  };
}

export interface TransactUpdateItem {
  Update: {
    Key: Key;
    TableName?: string;
    UpdateExpression: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
  };
}

export interface TransactConditionCheckItem {
  ConditionCheck: {
    Key: Key;
    TableName: string;
    ConditionExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
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
  // Add TableName to each item if not provided
  const itemsWithTableName = transactItems.map(item => {
    if ('Put' in item) {
      return {
        Put: {
          ...item.Put,
          TableName: item.Put.TableName || table.name,
        },
      };
    }
    if ('Delete' in item) {
      return {
        Delete: {
          ...item.Delete,
          TableName: item.Delete.TableName || table.name,
        },
      };
    }
    if ('Update' in item) {
      return {
        Update: {
          ...item.Update,
          TableName: item.Update.TableName || table.name,
        },
      };
    }
    return item;
  });

  return dbClient.send(new TransactWriteCommand({
    TransactItems: itemsWithTableName,
  } as TransactWriteCommandInput));
}

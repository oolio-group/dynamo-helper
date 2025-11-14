import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  BatchWriteCommandOutput,
  DeleteCommandOutput,
  PutCommandOutput,
  TransactWriteCommandOutput,
  UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { batchDeleteItems } from './mutation/batchDeleteItems';
import { batchPutItems } from './mutation/batchPutItems';
import { deleteItem } from './mutation/deleteItem';
import { putItem } from './mutation/putItem';
import { transactPutItems } from './mutation/transactPutItems';
import { transactWriteItems, TransactWriteItem } from './mutation/transactWriteItems';
import { updateItem } from './mutation/updateItem';
import { batchExists } from './query/batchExists';
import { batchGetItems } from './query/batchGetItems';
import { exists } from './query/exists';
import { getItem } from './query/getItem';
import { query } from './query/query';
import { queryWithCursor } from './query/queryWithCursor';
import {
  AnyObject,
  ConditionExpressionInput,
  Filter,
  TableConfig,
  Key,
} from './types';

export class DynamoHelper {
  table: TableConfig;
  dbClient: DynamoDBDocumentClient;

  /**
   * Create a DynamoHelper object
   * @param {string} region - The name of the region where the table is present
   * @param {string} table - The table name and indexes available
   * @param {string} endpoint - The endpoint of the database
   */
  constructor(table: TableConfig, region?: string, endpoint?: string) {
    const client = new DynamoDBClient({
      region,
      endpoint,
    });
    this.dbClient = DynamoDBDocumentClient.from(client);
    this.table = table;
  }

  async query<T extends AnyObject>(
    filter: Filter<T>,
    indexName?: string,
  ): Promise<Array<T>> {
    return query(this.dbClient, this.table, filter, indexName);
  }

  async queryWithCursor<T extends AnyObject>(
    filter: Filter<T>,
    indexName?: string,
  ): Promise<{ items: Array<T>; cursor?: string; scannedCount: number }> {
    return queryWithCursor(this.dbClient, this.table, filter, indexName);
  }

  async getItem<T extends AnyObject>(
    key: Key,
    fields?: Array<keyof T>,
    consistentRead?: boolean,
  ): Promise<T> {
    return getItem(this.dbClient, this.table, key, fields, consistentRead);
  }

  async batchGetItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keys: Array<{ [name: string]: any }>,
    fields?: Array<string>,
  ): Promise<Array<AnyObject>> {
    return batchGetItems(this.dbClient, this.table, keys, fields);
  }

  async exists(key: Key): Promise<boolean> {
    return exists(this.dbClient, this.table, key);
  }

  async batchExists(
    keys: Array<Key>,
  ): Promise<Array<Key>> {
    return batchExists(this.dbClient, this.table, keys);
  }

  async deleteItem(
    key: Key,
  ): Promise<DeleteCommandOutput> {
    return deleteItem(this.dbClient, this.table, key);
  }

  async batchDeleteItems(
    keys: Array<Key>,
  ): Promise<Array<BatchWriteCommandOutput>> {
    return batchDeleteItems(this.dbClient, this.table, keys);
  }

  async putItem<T extends AnyObject>(
    item: T,
    conditions?: ConditionExpressionInput[],
  ): Promise<PutCommandOutput> {
    return putItem(this.dbClient, this.table, item, conditions);
  }

  async batchPutItems(
    items: Array<AnyObject>,
  ): Promise<Array<BatchWriteCommandOutput>> {
    return batchPutItems(this.dbClient, this.table, items);
  }

  async transactPutItems(
    items: Array<AnyObject>,
  ): Promise<TransactWriteCommandOutput> {
    return transactPutItems(this.dbClient, this.table, items);
  }

  async transactWriteItems(
    transactItems: Array<TransactWriteItem>,
  ): Promise<TransactWriteCommandOutput> {
    return transactWriteItems(this.dbClient, this.table, transactItems);
  }

  async updateItem<T extends AnyObject>(
    key: Key,
    item: T,
    conditions: ConditionExpressionInput[],
  ): Promise<UpdateCommandOutput> {
    return updateItem(this.dbClient, this.table, key, conditions, item);
  }
}

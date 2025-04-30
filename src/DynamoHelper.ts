import { AWSError } from 'aws-sdk';
import {
  BatchWriteItemOutput,
  DeleteItemOutput,
  DocumentClient,
  PutItemOutput,
  TransactWriteItemsOutput,
  UpdateItemOutput,
} from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { batchDeleteItems } from './mutation/batchDeleteItems';
import { batchPutItems } from './mutation/batchPutItems';
import { deleteItem } from './mutation/deleteItem';
import { putItem } from './mutation/putItem';
import { transactPutItems } from './mutation/transactPutItems';
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
} from './types';
import { transactDeleteItems } from './mutation/transactDeleteItems';

export class DynamoHelper {
  table: TableConfig;
  dbClient: DocumentClient;

  /**
   * Create a DynamoHelper object
   * @param {string} region - The name of the region where the table is present
   * @param {string} table - The table name and indexes available
   * @param {string} endpoint - The endpoint of the database
   */
  constructor(table: TableConfig, region?: string, endpoint?: string) {
    this.dbClient = new DocumentClient({
      region,
      endpoint,
    });
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
    key: DocumentClient.Key,
    fields?: Array<keyof T>,
  ): Promise<T> {
    return getItem(this.dbClient, this.table, key, fields);
  }

  async batchGetItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keys: Array<{ [name: string]: any }>,
    fields?: Array<string>,
  ): Promise<Array<AnyObject>> {
    return batchGetItems(this.dbClient, this.table, keys, fields);
  }

  async exists(key: DocumentClient.Key): Promise<boolean> {
    return exists(this.dbClient, this.table, key);
  }

  async batchExists(
    keys: Array<DocumentClient.Key>,
  ): Promise<Array<DocumentClient.Key>> {
    return batchExists(this.dbClient, this.table, keys);
  }

  async deleteItem(
    key: DocumentClient.Key,
  ): Promise<PromiseResult<DeleteItemOutput, AWSError>> {
    return deleteItem(this.dbClient, this.table, key);
  }

  async batchDeleteItems(
    keys: Array<DocumentClient.Key>,
  ): Promise<Array<PromiseResult<BatchWriteItemOutput, AWSError>>> {
    return batchDeleteItems(this.dbClient, this.table, keys);
  }

  async putItem<T extends AnyObject>(
    item: T,
  ): Promise<PromiseResult<PutItemOutput, AWSError>> {
    return putItem(this.dbClient, this.table, item);
  }

  async batchPutItems(
    items: Array<AnyObject>,
  ): Promise<Array<PromiseResult<BatchWriteItemOutput, AWSError>>> {
    return batchPutItems(this.dbClient, this.table, items);
  }

  async transactPutItems(
    items: Array<AnyObject>,
  ): Promise<Array<PromiseResult<TransactWriteItemsOutput, AWSError>>> {
    return transactPutItems(this.dbClient, this.table, items);
  }

  async transactDeleteItems(
    keys: Array<DocumentClient.Key>,
  ): Promise<Array<PromiseResult<TransactWriteItemsOutput, AWSError>>> {
    return transactDeleteItems(this.dbClient, this.table, keys);
  }

  async updateItem<T extends AnyObject>(
    key: DocumentClient.Key,
    item: T,
    conditions: ConditionExpressionInput[],
  ): Promise<PromiseResult<UpdateItemOutput, AWSError>> {
    return updateItem(this.dbClient, this.table, key, conditions, item);
  }
}

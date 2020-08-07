import { AWSError } from 'aws-sdk';
import {
  BatchWriteItemOutput,
  DeleteItemOutput,
  DocumentClient,
  Key,
  PutItemOutput,
  TransactWriteItemsOutput,
} from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { batchDeleteItems } from './mutation/batchDeleteItems';
import { batchPutItems } from './mutation/batchPutItems';
import { deleteItem } from './mutation/deleteItem';
import { putItem } from './mutation/putItem';
import { transactPutItems } from './mutation/transactPutItems';
import { batchExists } from './query/batchExists';
import { batchGetItems } from './query/batchGetItems';
import { exists } from './query/exists';
import { getItem } from './query/getItem';
import { query } from './query/query';
import { AnyObject, Filter, TableConfig } from './types';

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

  async getItem<T extends AnyObject>(
    pk: string,
    sk: string,
    fields?: Array<keyof T>,
  ): Promise<T> {
    return getItem(this.dbClient, this.table, pk, sk, fields);
  }

  async batchGetItems(
    keys: Array<{ [name: string]: any }>,
    fields?: Array<string>,
  ): Promise<Array<AnyObject>> {
    return batchGetItems(this.dbClient, this.table, keys, fields);
  }

  async exists(pk: string, sk: string): Promise<boolean> {
    return exists(this.dbClient, this.table, pk, sk);
  }

  async batchExists(keys: Array<Key>): Promise<Array<Key>> {
    return batchExists(this.dbClient, this.table, keys);
  }

  async deleteItem(
    pk: string,
    sk: string,
  ): Promise<PromiseResult<DeleteItemOutput, AWSError>> {
    return deleteItem(this.dbClient, this.table, pk, sk);
  }

  async batchDeleteItems(
    keys: Array<Key>,
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
  ): Promise<PromiseResult<TransactWriteItemsOutput, AWSError>> {
    return transactPutItems(this.dbClient, this.table, items);
  }
}

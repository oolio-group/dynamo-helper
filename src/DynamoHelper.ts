import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AnyObject, Filter, TableConfig } from './types';
import { batchExists } from './query/batchExists';
import { query } from './query/query';
import { getItem } from './query/getItem';
import { batchGetItems } from './query/batchGetItems';
import { exists } from './query/exists';
import { AWSError } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { batchDeleteItems } from './mutation/batchDeleteItems';
import { batchPutItems } from './mutation/batchPutItems';
import { deleteItem } from './mutation/deleteItem';
import { putItem } from './mutation/putItem';
import { transactPutItems } from './mutation/transactPutItems';

export interface DynamoHelperOptions {
  /**
   * AWS Region
   */
  region?: string;
  /**
   * DynamoDB Endpoint, use to connect to local db
   */
  endpoint?: string;
  /**
   * Table options
   */
  table: TableConfig;
}

export class DynamoHelper {
  dbClient: DocumentClient;
  table: TableConfig;

  /**
   * Create a DynamoHelper object
   * @param {string} param.tableName - The name of your DynamoDB table
   * @param {string} param.region - The name of the region where the table is present
   * @param {string} param.tableIndexes - The table indexes available
   * @param {string} param.endpoint - The endpoint of the table
   */
  constructor({ region, table, endpoint }: DynamoHelperOptions) {
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
    return query(
      this.dbClient,
      this.table,
      filter,
      indexName,
    );
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

  async batchExists(
    keys: Array<DocumentClient.Key>,
  ): Promise<Array<DocumentClient.Key>> {
    return batchExists(this.dbClient, this.table, keys);
  }

  async deleteItem(
    pk: string,
    sk: string,
  ): Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWSError>> {
    return deleteItem(this.dbClient, this.table, pk, sk);
  }

  async batchDeleteItems(
    keys: Array<DocumentClient.Key>,
  ): Promise<
    Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
  > {
    return batchDeleteItems(this.dbClient, this.table, keys);
  }

  async putItem<T extends AnyObject>(
    item: T,
  ): Promise<PromiseResult<DocumentClient.PutItemOutput, AWSError>> {
    return putItem(this.dbClient, this.table, item);
  }

  async batchPutItems(
    items: Array<AnyObject>,
  ): Promise<
    Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
  > {
    return batchPutItems(this.dbClient, this.table, items);
  }

  async transactPutItems(
    items: Array<AnyObject>,
  ): Promise<PromiseResult<DocumentClient.TransactWriteItemsOutput, AWSError>> {
    return transactPutItems(this.dbClient, this.table, items);
  }
}

import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { AnyObject, Filter } from "./types";
import { batchExists } from "./query/batchExists";
import { query } from "./query/query";
import { getItem } from "./query/getItem";
import { batchGetItems } from "./query/batchGetItems";
import { exists } from "./query/exists";
import { AWSError } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { batchDeleteItems } from "./mutation/batchDeleteItems";
import { batchPutItems } from "./mutation/batchPutItems";
import { deleteItem } from "./mutation/deleteItem";
import { putItem } from "./mutation/putItem";
import { transactPutItems } from "./mutation/transactPutItems";

class DynamoHelper {
  dynamoHelper: jest.Mock<any, any>;
  [x: string]: jest.Mock<any, any>;
  dbClient: DocumentClient;
  tableName: string;
  tableIndexes: Record<
    string,
    { partitionKeyName: string; sortKeyName: string }
  >;
  region: string;

  /**
   * Create a DynamoHelper object
   * @param {string} param.tableName - The name of your DynamoDB table
   * @param {string} param.region - The name of the region where the table is present
   * @param {string} param.tableIndexes - The table indexes available
   * @param {string} param.endpoint - The endpoint of the table
   */
  constructor({ region, tableName, tableIndexes, endpoint = "" }) {
    this.dbClient = new DocumentClient({
      region,
      endpoint,
    });
    this.tableName = tableName;
    this.tableIndexes = tableIndexes;
    this.region = region;
  }

  async query<T extends AnyObject>(
    filter: Filter<T>,
    indexName?: string
  ): Promise<Array<T>> {
    return query(
      this.dbClient,
      this.tableName,
      this.tableIndexes,
      filter,
      indexName
    );
  }

  async getItem<T extends AnyObject>(
    pk: string,
    sk: string,
    fields?: Array<keyof T>
  ): Promise<T> {
    return getItem(this.dbClient, this.tableName, pk, sk, fields);
  }

  async batchGetItems(
    keys: Array<{ [name: string]: any }>,
    fields?: Array<string>
  ): Promise<Array<AnyObject>> {
    return batchGetItems(this.dbClient, this.tableName, keys, fields);
  }

  async exists(pk: string, sk: string): Promise<boolean> {
    return exists(this.dbClient, this.tableName, this.tableIndexes, pk, sk);
  }

  async batchExists(
    keys: Array<DocumentClient.Key>
  ): Promise<Array<DocumentClient.Key>> {
    return batchExists(this.dbClient, this.tableName, keys);
  }

  async deleteItem(
    pk: string,
    sk: string
  ): Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWSError>> {
    return deleteItem(this.dbClient, this.tableName, pk, sk);
  }

  async batchDeleteItems(
    keys: Array<DocumentClient.Key>
  ): Promise<
    Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
  > {
    return batchDeleteItems(this.dbClient, this.tableName, keys);
  }

  putItem<T extends AnyObject>(
    item: T
  ): Promise<PromiseResult<DocumentClient.PutItemOutput, AWSError>> {
    return putItem(this.dbClient, this.tableName, item);
  }

  async batchPutItems(
    items: Array<AnyObject>
  ): Promise<
    Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
  > {
    return batchPutItems(this.dbClient, this.tableName, items);
  }

  async transactPutItems(
    items: Array<AnyObject>
  ): Promise<PromiseResult<DocumentClient.TransactWriteItemsOutput, AWSError>> {
    return transactPutItems(this.dbClient, this.tableName, items);
  }
}

export default DynamoHelper;

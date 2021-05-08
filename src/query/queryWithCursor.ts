import { DocumentClient, Key, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { decrypt, encrypt } from '../utils';
import {
  AnyObject,
  Filter,
  QueryWithCursorOptions,
  TableConfig,
} from '../types';
import { buildQueryTableParams } from './queryBuilder';

/**
 * Cursor based query which returns list of matching items and the last cursor position
 *
 * @param {Filter<T>} filter query filter
 * @param { QueryWithCursorOptions } options cursor, page size options
 * @returns {Array<T>, string} list of matching items, last cursor position
 */
export async function queryWithCursor<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  filter: Filter<T>,
  options: QueryWithCursorOptions,
): Promise<{ items: Array<T>; cursor?: string }> {
  const { indexName = 'default', prevCursor, secret } = options || {};
  const { partitionKeyName, sortKeyName } = table.indexes[indexName];

  if (!sortKeyName) {
    throw new Error('Expected sortKey to query');
  }

  if (!secret) {
    throw new Error(
      'Expected secret which is used to encrypt the `LastEvaluatedKey`',
    );
  }

  const params = buildQueryTableParams(filter, partitionKeyName, sortKeyName);

  params.TableName = table.name;
  if (indexName) {
    params.IndexName = indexName;
  }
  params.ExclusiveStartKey = decrypt<Key>(prevCursor, secret);

  const { LastEvaluatedKey, Items }: QueryOutput = await dbClient
    .query(params)
    .promise();

  return {
    items: Items as T[],
    cursor: encrypt<Key>(LastEvaluatedKey, secret),
  };
}

import { DocumentClient, Key, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { decrypt, encrypt } from '../utils';
import { AnyObject, Filter, TableConfig } from '../types';
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
  indexName = 'default',
): Promise<{ items: Array<T>; cursor?: string; scannedCount: number }> {
  const { partitionKeyName, sortKeyName } = table.indexes[indexName];

  if (!sortKeyName) {
    throw new Error('Expected sortKey to query');
  }

  if (!table.cursorSecret) {
    throw new Error(
      'Expected `cursorSecret` which is used to encrypt the `LastEvaluatedKey`',
    );
  }

  const params = buildQueryTableParams(filter, partitionKeyName, sortKeyName);

  params.TableName = table.name;
  if (indexName) {
    params.IndexName = indexName;
  }
  params.ExclusiveStartKey = decrypt<Key>(
    filter.prevCursor,
    table.cursorSecret,
  );

  const {
    LastEvaluatedKey,
    Items,
    ScannedCount,
  }: QueryOutput = await dbClient.query(params).promise();

  return {
    items: Items as T[],
    cursor: encrypt<Key>(LastEvaluatedKey, table.cursorSecret),
    scannedCount: ScannedCount,
  };
}

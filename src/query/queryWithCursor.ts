import { DocumentClient, Key, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { decrypt, encrypt } from '../utils';
import { AnyObject, Filter, TableConfig } from '../types';
import { buildQueryTableParams } from './queryBuilder';

const DEFAULT_LIMIT = 99999;

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
  indexName?: string,
): Promise<{ items: Array<T>; cursor?: string; scannedCount: number }> {
  const { partitionKeyName, sortKeyName } = table.indexes[
    indexName || 'default'
  ];

  if (!sortKeyName) {
    throw new Error('Expected sortKey to query');
  }

  if (!table.cursorSecret) {
    throw new Error(
      'Expected `cursorSecret` which is used to encrypt the `LastEvaluatedKey`',
    );
  }

  const params = buildQueryTableParams(filter, partitionKeyName, sortKeyName);

  if (!params?.Limit) {
    params.Limit = DEFAULT_LIMIT;
  }

  params.TableName = table.name;
  if (indexName) {
    params.IndexName = indexName;
  }
  params.ExclusiveStartKey = decrypt<Key>(
    filter.prevCursor,
    table.cursorSecret,
  );

  const originalLimit = params.Limit;
  let items = [];
  let totalScannedCount = 0;
  let output: QueryOutput = {};

  do {
    if (output.LastEvaluatedKey) {
      params.ExclusiveStartKey = output.LastEvaluatedKey;
    }
    if (items.length) {
      params.Limit = originalLimit - items.length;
    }

    output = await dbClient.query(params).promise();
    totalScannedCount += output.ScannedCount;

    items = items.concat(output.Items);
  } while (output.LastEvaluatedKey && !(items.length >= originalLimit));

  return {
    items: items as T[],
    cursor: encrypt<Key>(output.LastEvaluatedKey, table.cursorSecret),
    scannedCount: totalScannedCount,
  };
}

import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TableConfig, Key } from '../types';
import { batchGetItems } from './batchGetItems';

/**
 * Checks if the given keys of items exists in DB or not
 * @param keys list of keys to be checked
 * @returns list of keys that doesn't exist in DB, empty of all keys exists
 */
export async function batchExists(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  keys: Array<Key>,
): Promise<Array<Key>> {
  const index = table.indexes.default;
  const result = (
    await batchGetItems(dbClient, table, keys, [
      index.partitionKeyName,
      index.sortKeyName,
    ])
  ).filter(x => !!x);

  if (result.length !== keys.length) {
    const foundItemsKeyMap = result.map(x => Object.values(x).join(':+:'));
    const notFoundItems = keys.filter(
      x => !foundItemsKeyMap.includes(Object.values(x).join(':+:')),
    );
    return notFoundItems;
  }

  return [];
}

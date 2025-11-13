import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getItem } from './getItem';
import { TableConfig, Key } from '../types';

/**
 * Checks if an item with a given pk sk combo exists in DB or not
 * @param pk partition key value
 * @param sk sort key value
 * @returns {Boolean} exists or not
 */
export async function exists(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  key: Key,
): Promise<boolean> {
  const item = await getItem(dbClient, table, key, ['id']);
  return item ? true : false;
}

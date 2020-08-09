import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { getItem } from './getItem';
import { TableConfig } from '../types';

/**
 * Checks if an item with a given pk sk combo exists in DB or not
 * @param pk partition key value
 * @param sk sort key value
 * @returns {Boolean} exists or not
 */
export async function exists(
  dbClient: DocumentClient,
  table: TableConfig,
  key: DocumentClient.Key,
): Promise<boolean> {
  const item = await getItem(dbClient, table, key, ['id']);
  return item ? true : false;
}

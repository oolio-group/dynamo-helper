import { DynamoDBDocumentClient, DeleteCommand, DeleteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { TableConfig, Key } from '../types';

/**
 * Delete item matching specified key
 * @param pk partition key value
 * @param sk sort key value
 */
export async function deleteItem(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  key: Key,
): Promise<DeleteCommandOutput> {
  const index = table.indexes.default;

  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  if (!key[index.partitionKeyName]) {
    throw new Error(
      'Invalid key: expected key to contain at least partition key',
    );
  }

  return dbClient.send(new DeleteCommand({
    TableName: table.name,
    Key: key,
  }));
}

import { DynamoDBDocumentClient, GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';
import { AnyObject, TableConfig, Key } from '../types';

/**
 * Get item by partition key and sort key
 * Both parameters are required
 * @param pk partition key
 * @param sk sort key
 * @returns {T} resolved item
 */
export async function getItem<T extends AnyObject>(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  key: Key,
  fields?: Array<keyof T>,
): Promise<T> {
  const index = table.indexes.default;

  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  if (!key[index.partitionKeyName]) {
    throw new Error(
      'Invalid key: expected key to contain at least partition key',
    );
  }

  const params: GetCommandInput = {
    Key: key,
    TableName: table.name,
  };

  if (fields && fields.length) {
    params.ProjectionExpression = fields.join(',');
  }

  const result = await dbClient.send(new GetCommand(params));

  return result && result.Item ? (result.Item as T) : null;
}

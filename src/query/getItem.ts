import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AnyObject, TableConfig } from '../types';

/**
 * Get item by partition key and sort key
 * Both parameters are required
 * @param pk partition key
 * @param sk sort key
 * @returns {T} resolved item
 */
export async function getItem<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  key: DocumentClient.Key,
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

  const params: DocumentClient.GetItemInput = {
    Key: key,
    TableName: table.name,
  };

  if (fields && fields.length) {
    params.ProjectionExpression = fields.join(',');
  }

  const result = await dbClient.get(params).promise();

  return result && result.Item ? (result.Item as T) : null;
}

import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { TableConfig } from '../types';

/**
 * Delete item matching specified key
 * @param pk partition key value
 * @param sk sort key value
 */
export async function deleteItem(
  dbClient: DocumentClient,
  table: TableConfig,
  key: DocumentClient.Key,
): Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWSError>> {
  const index = table.indexes.default;

  if (!key || typeof key !== 'object' || Object.keys(key).length === 0) {
    throw new Error('Expected key to be of type object and not empty');
  }

  if (!key[index.partitionKeyName]) {
    throw new Error(
      'Invalid key: expected key to contain at least partition key',
    );
  }

  return dbClient
    .delete({
      TableName: table.name,
      Key: key,
    })
    .promise();
}

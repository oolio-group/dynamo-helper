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
  pk: string,
  sk: string,
): Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWSError>> {
  const index = table.indexes.default;

  return dbClient
    .delete({
      TableName: table.name,
      Key: {
        [index.partitionKeyName]: pk,
        [index.sortKeyName]: sk,
      },
    })
    .promise();
}

import { DynamoDBDocumentClient, BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import chunk from 'lodash/chunk';
import { TableConfig, Key } from '../types';

export function batchDeleteItems(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  keys: Array<Key>,
): Promise<Array<BatchWriteCommandOutput>> {
  // batchWriteItem accepts maximum of 25 items, 16 MB total and 400KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
  // Make chunks of 25 items
  const batches = chunk(keys, 25) as Array<Array<Key>>;

  return Promise.all(
    batches.map(x =>
      dbClient.send(new BatchWriteCommand({
        RequestItems: {
          [table.name]: x.map(key => ({
            DeleteRequest: {
              Key: key,
            },
          })),
        },
      })),
    ),
  );
}

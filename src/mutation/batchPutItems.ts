import { DynamoDBDocumentClient, BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import chunk from 'lodash/chunk';
import { AnyObject, TableConfig } from '../types';

export function batchPutItems(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  items: Array<AnyObject>,
): Promise<Array<BatchWriteCommandOutput>> {
  // batchWriteItem accepts maximum of 25 items, 16 MB total and 400KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
  // Make chunks of 25 items
  const batches = chunk(items, 25) as Array<AnyObject[]>;

  return Promise.all(
    batches.map(x =>
      dbClient.send(new BatchWriteCommand({
        RequestItems: {
          [table.name]: x.map(item => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      })),
    ),
  );
}

import { AWSError } from 'aws-sdk';
import { DocumentClient, WriteRequest } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import chunk from 'lodash/chunk';
import { AnyObject, TableConfig } from '../types';

export function batchPutItems(
  dbClient: DocumentClient,
  table: TableConfig,
  items: Array<AnyObject>,
): Promise<
  Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
> {
  // batchWriteItem accepts maximum of 25 items, 16 MB total and 400KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
  // Make chunks of 25 items
  const batches = chunk(items, 25) as Array<AnyObject[]>;

  return Promise.all(
    batches.map(x =>
      dbClient
        .batchWrite({
          RequestItems: {
            [table.name]: x.map<WriteRequest>(item => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        })
        .promise(),
    ),
  );
}

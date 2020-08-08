import { AWSError } from 'aws-sdk';
import {
  BatchWriteItemOutput,
  DocumentClient,
  Key,
  WriteRequest,
} from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import chunk from 'lodash/chunk';
import { TableConfig } from '../types';

export function batchDeleteItems(
  dbClient: DocumentClient,
  table: TableConfig,
  keys: Array<Key>,
): Promise<Array<PromiseResult<BatchWriteItemOutput, AWSError>>> {
  // batchWriteItem accepts maximum of 25 items, 16 MB total and 400KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
  // Make chunks of 25 items
  const batches = chunk(keys, 25) as Array<Key[]>;

  return Promise.all(
    batches.map(x =>
      dbClient
        .batchWrite({
          RequestItems: {
            [table.name]: x.map<WriteRequest>(key => ({
              DeleteRequest: {
                Key: key,
              },
            })),
          },
        })
        .promise(),
    ),
  );
}

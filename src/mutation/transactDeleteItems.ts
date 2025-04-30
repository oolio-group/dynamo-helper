import { AWSError } from 'aws-sdk';
import { DocumentClient, TransactWriteItem } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AnyObject, TableConfig } from '../types';
import chunk from 'lodash/chunk';

/**
 * Delete multiple items in the DB as a transaction
 * Operation fails if any one of the item operation fails
 * @param items List of items
 */
export function transactDeleteItems(
  dbClient: DocumentClient,
  table: TableConfig,
  keys: Array<DocumentClient.Key>,
): Promise<
  Array<PromiseResult<DocumentClient.TransactWriteItemsOutput, AWSError>>
> {
  // TransactWriteItems accepts maximum of 100 items, 4 MB total and 400 KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
  const batches = chunk(keys, 100) as Array<AnyObject[]>;

  return Promise.all(
    batches.map(x =>
      dbClient
        .transactWrite({
          TransactItems: x.map<TransactWriteItem>(x => ({
            Delete: {
              TableName: table.name,
              Key: x,
            },
          })),
        })
        .promise(),
    ),
  );
}

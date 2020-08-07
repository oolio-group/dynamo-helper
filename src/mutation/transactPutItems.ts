import { AWSError } from 'aws-sdk';
import { DocumentClient, TransactWriteItem } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AnyObject, TableConfig } from '../types';

/**
 * Put multiple items in the DB as a transaction
 * Operation fails if any one of the item operation fails
 * @param items List of items
 */
export function transactPutItems(
  dbClient: DocumentClient,
  table: TableConfig,
  items: Array<AnyObject>,
): Promise<PromiseResult<DocumentClient.TransactWriteItemsOutput, AWSError>> {
  return dbClient
    .transactWrite({
      TransactItems: items.map<TransactWriteItem>(x => ({
        Put: {
          TableName: table.name,
          Item: x,
        },
      })),
    })
    .promise();
}

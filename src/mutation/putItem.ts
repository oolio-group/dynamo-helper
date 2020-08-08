import { AnyObject, TableConfig } from '../types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError } from 'aws-sdk';

/**
 * Writes item in database.
 * If provided keys already exists then it is replaced
 * @param item object to put
 */
export async function putItem<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  item: T
): Promise<PromiseResult<DocumentClient.PutItemOutput, AWSError>> {
  if (item === null || item === undefined) {
    throw new Error(`Expected on argument of type object received ${item}`);
  } else if (typeof item !== 'object') {
    throw new Error(
      `Expected on argument of type object received ${typeof item}`
    );
  }

  return dbClient
    .put({
      Item: item,
      TableName: table.name,
    })
    .promise();
}

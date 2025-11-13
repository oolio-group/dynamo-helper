import { AnyObject, TableConfig } from '../types';
import { DynamoDBDocumentClient, PutCommand, PutCommandOutput } from '@aws-sdk/lib-dynamodb';

/**
 * Writes item in database.
 * If provided keys already exists then it is replaced
 * @param item object to put
 */
export async function putItem<T extends AnyObject>(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  item: T
): Promise<PutCommandOutput> {
  if (item === null || item === undefined) {
    throw new Error(`Expected on argument of type object received ${item}`);
  } else if (typeof item !== 'object') {
    throw new Error(
      `Expected on argument of type object received ${typeof item}`
    );
  }

  return dbClient.send(new PutCommand({
    Item: item,
    TableName: table.name,
  }));
}

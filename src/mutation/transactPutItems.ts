import { DynamoDBDocumentClient, TransactWriteCommand, TransactWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { AnyObject, TableConfig } from '../types';

/**
 * Put multiple items in the DB as a transaction
 * Operation fails if any one of the item operation fails
 * @param items List of items
 */
export function transactPutItems(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  items: Array<AnyObject>,
): Promise<TransactWriteCommandOutput> {
  return dbClient.send(new TransactWriteCommand({
    TransactItems: items.map(x => ({
      Put: {
        TableName: table.name,
        Item: x,
      },
    })),
  }));
}

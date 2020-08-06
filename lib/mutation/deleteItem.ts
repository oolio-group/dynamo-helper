import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { PromiseResult } from "aws-sdk/lib/request";
import { AWSError } from "aws-sdk";

/**
 * Delete item matching specified key
 * @param pk partition key value
 * @param sk sort key value
 */
export function deleteItem(
  dbClient: DocumentClient,
  tableName: string,
  pk: string,
  sk: string
): Promise<PromiseResult<DocumentClient.DeleteItemOutput, AWSError>> {
  return dbClient
    .delete({
      TableName: tableName,
      Key: {
        pk,
        sk,
      },
    })
    .promise();
}

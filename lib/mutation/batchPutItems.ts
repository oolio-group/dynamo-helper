import { AnyObject } from "../types";
import { DocumentClient, WriteRequest } from "aws-sdk/clients/dynamodb";
import { PromiseResult } from "aws-sdk/lib/request";
import { AWSError } from "aws-sdk";
import { chunk } from "lodash";

export function batchPutItems(
  dbClient: DocumentClient,
  tableName: string,
  items: Array<AnyObject>
): Promise<
  Array<PromiseResult<DocumentClient.BatchWriteItemOutput, AWSError>>
> {
  // batchWriteItem accepts maximum of 25 items, 16 MB total and 400KB per each item
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
  // Make chunks of 25 items
  const batches = chunk(items, 25);

  return Promise.all(
    batches.map((x: any[]) =>
      dbClient
        .batchWrite({
          RequestItems: {
            [tableName]: x.map<WriteRequest>((item: any) => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        })
        .promise()
    )
  );
}

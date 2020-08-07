import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { AnyObject } from "../types";
import chunk from "lodash/chunk";
import flatten from "lodash/flatten";
/**
 * Get many items from the db matching the provided keys
 * @param keys array of key maps. eg: [{ pk: '1', sk: '2'}]
 * @returns list of items
 */
export async function batchGetItems(
  dbClient: DocumentClient,
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keys: Array<{ [name: string]: any }>,
  fields?: Array<string>
): Promise<Array<AnyObject>> {
  let result: DocumentClient.BatchGetItemOutput;
  let unProcessedKeys = [];

  // Chunk requests to bits of 100s as max items per batchGet operation is 100
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html
  if (keys.length > 100) {
    const results = await Promise.all(
      chunk(keys, 100).map((x) => batchGetItems(dbClient, tableName, x))
    );
    return flatten(results);
  }

  const items = [];

  do {
    result = await dbClient
      .batchGet({
        RequestItems: {
          [tableName]: {
            Keys: unProcessedKeys.length > 0 ? unProcessedKeys : keys,
            ProjectionExpression: fields ? fields.join(",") : undefined,
          },
        },
      })
      .promise();

    if (result.UnprocessedKeys && result.UnprocessedKeys[tableName]) {
      unProcessedKeys = result.UnprocessedKeys[tableName].Keys;
    }

    items.push(...(result.Responses[tableName] || []));
  } while (unProcessedKeys.length > 0);

  return items;
}

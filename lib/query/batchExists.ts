import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { batchGetItems } from "./query";

/**
 * Checks if the given keys of items exists in DB or not
 * @param keys list of keys to be checked
 * @returns list of keys that doesn't exist in DB, empty of all keys exists
 */
export async function batchExists(
  dbClient: DocumentClient,
  tableName: string,
  keys: Array<DocumentClient.Key>
): Promise<Array<DocumentClient.Key>> {
  const result = await batchGetItems(dbClient, tableName, keys, ["pk", "sk"]);

  if (result.length !== keys.length) {
    const foundItemsKeyMap = result.map((x) => Object.values(x).join(":+:"));
    const notFoundItems = keys.filter(
      (x) => !foundItemsKeyMap.includes(Object.values(x).join(":+:"))
    );
    return notFoundItems;
  }

  return [];
}

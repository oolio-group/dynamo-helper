import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { getItem } from "./getItem";

/**
 * Checks if an item with a given pk sk combo exists in DB or not
 * @param pk partition key value
 * @param sk sort key value
 * @returns {Boolean} exists or not
 */
export async function exists(
  dbClient: DocumentClient,
  tableName: string,
  tableIndexes: Record<
    string,
    { partitionKeyName: string; sortKeyName: string }
  >,
  pk: string,
  sk: string
): Promise<boolean> {
  const item = await getItem(dbClient, tableName, pk, sk, ["id"]);
  return item ? true : false;
}

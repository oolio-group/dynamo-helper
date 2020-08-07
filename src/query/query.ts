import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { buildQueryTableParams } from "./queryBuilder";
import { AnyObject, Filter, QueryInput } from "../types";

/**
 * Queries DynamoDB and returns list of matching items
 * @param {Filter<T>} filter query filter
 * @returns {Array<T>} list of matching items
 */
export async function query<T extends AnyObject>(
  dbClient: DocumentClient,
  tableName: string,
  tableIndexes: Record<
    string,
    { partitionKeyName: string; sortKeyName: string }
  >,
  filter: Filter<T>,
  indexName?: string
): Promise<Array<T>> {
  const index = tableIndexes[indexName || "default"];
  const params: QueryInput = {
    ...buildQueryTableParams(filter, index.partitionKeyName, index.sortKeyName),
    TableName: tableName,
  };

  if (indexName) {
    params.IndexName = indexName;
  }

  let lastEvaluatedKey;
  let items: T[] = [];

  do {
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dbClient.query(params).promise();

    items = items.concat(result.Items as T[]);

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

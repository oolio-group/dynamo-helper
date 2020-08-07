import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { AnyObject, TableConfig } from "../types";

/**
 * Get item by partition key and sort key
 * Both parameters are required
 * @param pk partition key
 * @param sk sort key
 * @returns {T} resolved item
 */
export async function getItem<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  pk: string,
  sk: string,
  fields?: Array<keyof T>
): Promise<T> {
  if (typeof pk !== "string" || typeof sk !== "string") {
    throw new Error(
      `Expected two arguments of type string, string received ${typeof pk}, ${typeof sk}`
    );
  } else if (!(pk && sk)) {
    throw new Error("Expected both arguments to have length greater than 0");
  }

  const index = table.indexes.default;

  const params: DocumentClient.GetItemInput = {
    Key: {
      [index.partitionKeyName]: pk,
      [index.sortKeyName]: sk,
    },
    TableName: table.name,
  };

  if (fields && fields.length) {
    params.ProjectionExpression = fields.join(",");
  }

  const result = await dbClient.get(params).promise();

  return result && result.Item ? (result.Item as T) : null;
}

import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AnyObject, Filter, TableConfig } from '../types';
import { buildQueryTableParams } from './queryBuilder';

/**
 * Queries DynamoDB and returns list of matching items
 * @param {Filter<T>} filter query filter
 * @param {string} indexName optional index name
 * @param {boolean} consistentRead optional consistent read flag
 * @returns {Array<T>} list of matching items
 */
export async function query<T extends AnyObject>(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  filter: Filter<T>,
  indexName?: string,
  consistentRead?: boolean,
): Promise<Array<T>> {
  const { partitionKeyName, sortKeyName } = table.indexes[
    indexName || 'default'
  ];
  const params = buildQueryTableParams(filter, partitionKeyName, sortKeyName);

  params.TableName = table.name;

  if (indexName) {
    params.IndexName = indexName;
  }

  if (consistentRead !== undefined) {
    params.ConsistentRead = consistentRead;
  }

  const originalLimit = params.Limit;
  let lastEvaluatedKey;
  let items: T[] = [];

  do {
    // Create a copy of params for this iteration to avoid mutation issues
    const requestParams = { ...params };

    if (lastEvaluatedKey) {
      requestParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    // Adjust limit for subsequent requests if original limit is set
    if (originalLimit && items.length > 0) {
      requestParams.Limit = originalLimit - items.length;
    }

    const result = await dbClient.send(new QueryCommand(requestParams));

    items = items.concat(result.Items as T[]);

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey && !(originalLimit && items.length >= originalLimit));

  // Ensure we don't return more items than the original limit
  if (originalLimit && items.length > originalLimit) {
    return items.slice(0, originalLimit);
  }

  return items;
}

import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AnyObject, Filter, TableConfig } from '../types';
import { buildQueryTableParams } from './queryBuilder';

/**
 * Queries DynamoDB and returns list of matching items
 * @param {Filter<T>} filter query filter
 * @returns {Array<T>} list of matching items
 */
export async function query<T extends AnyObject>(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  filter: Filter<T>,
  indexName?: string,
): Promise<Array<T>> {
  const { partitionKeyName, sortKeyName } = table.indexes[
    indexName || 'default'
  ];
  const params = buildQueryTableParams(filter, partitionKeyName, sortKeyName);

  params.TableName = table.name;

  if (indexName) {
    params.IndexName = indexName;
  }

  let lastEvaluatedKey;
  let items: T[] = [];

  do {
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dbClient.send(new QueryCommand(params));

    items = items.concat(result.Items as T[]);

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

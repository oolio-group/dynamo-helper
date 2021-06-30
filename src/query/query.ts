import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AnyObject, Filter, TableConfig } from '../types';
import { buildQueryTableParams } from './queryBuilder';

/**
 * Queries DynamoDB and returns list of matching items
 * @param {Filter<T>} filter query filter
 * @returns {Array<T>} list of matching items
 */
export async function query<T extends AnyObject>(
  dbClient: DocumentClient,
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

    const result = await dbClient.query(params).promise();

    items = items.concat(result.Items as T[]);

    // if next item available it is not undefined
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (
    lastEvaluatedKey &&
    (params?.Limit ? items.length < params.Limit : true)
  );

  return items;
}

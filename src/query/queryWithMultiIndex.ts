import { DocumentClient, Key, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { decrypt, encrypt } from '../utils';
import { AnyObject, Filter, TableConfig } from '../types';
import { buildQueryTableParams } from './queryBuilder';
import { keyBy } from 'lodash';

const DEFAULT_LIMIT = 99999;

export type Queries = {
  filter: Filter;
  indexName?: string;
};

export interface Cursor {
  [indexName: string]: Key;
}

export interface Outputs extends QueryOutput {
  indexName?: string;
}

/**
 * Cursor based query which returns list of matching items and the last cursor position
 *
 * @param {Queries} queries array of query filter with index
 * @param { QueryWithCursorOptions } options cursor, page size options
 * @param {number} limit number of items
 * @param {string} prevCursor starting cursor position
 * @returns {Array<T>, string} list of matching items, last cursor position
 */
export async function queryWithMultiIndex<T extends AnyObject>(
  dbClient: DocumentClient,
  table: TableConfig,
  queries: Queries[],
  limit?: number,
  prevCursor?: string,
): Promise<{ items: Array<T>; cursor?: string; scannedCount: number }> {
  if (!table.cursorSecret) {
    throw new Error(
      'Expected `cursorSecret` which is used to encrypt the `LastEvaluatedKey`',
    );
  }
  let queryParams = [];
  const cursor = prevCursor
    ? decrypt<Cursor>(prevCursor, table.cursorSecret)
    : {};
  // process each query
  for (const query of queries) {
    const { partitionKeyName, sortKeyName } = table.indexes[
      query.indexName || 'default'
    ];

    if (!sortKeyName) {
      throw new Error('Expected sortKey to query');
    }

    const params = buildQueryTableParams(
      query.filter,
      partitionKeyName,
      sortKeyName,
    );
    params.TableName = table.name;
    if (query.indexName) {
      params.IndexName = query.indexName;
    }
    if (cursor.indexName) {
      params.ExclusiveStartKey = cursor.indexName;
    }
    queryParams.push(dbClient.query(params).promise());
  }

  if (!limit) {
    limit = DEFAULT_LIMIT;
  }

  let items = [];
  let totalScannedCount = 0;
  let outputs: Outputs[] = [];
  let totalItems = [];

  do {
    const commonItems = [];
    outputs = await Promise.all(queryParams);

    totalScannedCount += outputs.reduce(
      (total, output) => total + output.ScannedCount,
      0,
    );
    const outputItems = outputs.map(output => output.Items);
    totalItems = outputItems.map(item => ({ ...item, ...keyBy(item, 'id') }));
    // intersection with all available options
    outputItems.flat().forEach(outputItem => {
      let matched = true;
      let matchedItems;
      for (const indexItems of totalItems) {
        if (!indexItems.has(outputItem.id)) {
          matched = false;
          break;
        }
        if (!matchedItems) {
          matchedItems = indexItems.get(outputItem.id);
        }
      }
      if (matched) {
        // first targeted item into consideration
        commonItems.push(matchedItems);
      }
    });
    items = items.concat(commonItems);

    // filter and reassignment of startKey for next query
    for (let i = 0; i < outputs.length; i++) {
      queryParams[i].ExclusiveStartKey = outputs[i].LastEvaluatedKey;
      outputs[i].indexName = queryParams[i].indexName;
    }
    queryParams = queryParams.filter(output => output.ExclusiveStartKey);
  } while (queryParams.length && !(items.length >= limit));
  const outputCursor = outputs.reduce(
    (acc, curr) => ({ ...acc, [curr.indexName]: curr.LastEvaluatedKey }),
    {},
  ) as Cursor;
  return {
    items: items as T[],
    cursor: encrypt<Cursor>(outputCursor, table.cursorSecret),
    scannedCount: totalScannedCount,
  };
}

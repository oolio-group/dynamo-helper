import { DynamoDB } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

/**
 * Objects with open properties
 */
export interface AnyObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [property: string]: any;
}

export type QueryInput = DynamoDB.DocumentClient.QueryInput;

/**
 * DynamoDB supported operators
 */
export type DynamoDBOperators =
  | '='
  | '>'
  | '>='
  | '<'
  | '<='
  | '<>'
  | 'BETWEEN'
  | 'BEGINS_WITH'
  | 'IN'
  | 'EXISTS'
  | 'CONTAINS';

/**
 * Operators for where clauses
 */
export type FilterOperators =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'inq'
  | 'between'
  | 'like'
  | 'exists'
  | 'beginsWith';
/**
 * Matching predicate comparison
 */
export type PredicateComparison<PT> = {
  eq?: PT;
  neq?: PT;
  gt?: PT;
  gte?: PT;
  lt?: PT;
  lte?: PT;
  inq?: PT[];
  nin?: PT[];
  between?: [PT, PT];
  exists?: boolean;
  like?: PT;
  nlike?: PT;
  ilike?: PT;
  nilike?: PT;
  beginsWith?: PT;
};
/**
 * Value types for `{propertyName: value}`
 */
export type ShortHandEqualType = string | number | boolean | Date;
/**
 * Key types of a given model, excluding operators
 */
export type KeyOf<MT extends object> = Exclude<
  Extract<keyof MT, string>,
  FilterOperators
>;
/**
 * Condition clause
 *
 * @example
 * ```ts
 * {
 *   name: {inq: ['John', 'Mary']},
 *   status: 'ACTIVE',
 *   age: {gte: 40}
 * }
 * ```
 */
export type Condition<MT extends object> = {
  [P in KeyOf<MT>]?: PredicateComparison<MT[P]> | (MT[P] & ShortHandEqualType);
};
/**
 * Where clause
 *
 * @example
 * ```ts
 * {
 *   name: {inq: ['John', 'Mary']},
 *   status: 'ACTIVE'
 *   and: [...],
 *   or: [...],
 * }
 * ```
 */
export type Where<MT extends object = AnyObject> =
  | Condition<MT>
  | AndClause<MT>
  | OrClause<MT>;
/**
 * And clause
 *
 * @example
 * ```ts
 * {
 *   and: [...],
 * }
 * ```
 */
export interface AndClause<MT extends object> {
  and: Where<MT>[];
}
/**
 * Or clause
 *
 * @example
 * ```ts
 * {
 *   or: [...],
 * }
 * ```
 */
export interface OrClause<MT extends object> {
  or: Where<MT>[];
}

/**
 * Order by direction
 */
export enum Direction {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Selection of fields
 *
 * Example:
 * fields: ['id', 'isActive]
 */
export type Fields<MT = AnyObject> = Array<keyof MT>;

/**
 * Query filter object
 */
export interface Filter<MT extends object = AnyObject> {
  /**
   * The matching criteria
   */
  where?: Where<MT>;
  /**
   * To include/exclude fields
   */
  fields?: Fields<MT>;
  /**
   * Maximum number of entities
   */
  limit?: number;
  /**
   * Sort order. Only works with sort keys
   */
  orderBy?: Direction;

  /**
   * Only be used with cursor based `query`
   */
  prevCursor?: string;
}

type TableIndex = { partitionKeyName: string; sortKeyName?: string };

export interface TableConfig {
  name: string;
  /**
   * A record of table index and it's key names
   * Required on query and get operations dealing with indexes
   * A default index is always required]
   * eg: indexes: { default: { partitionKeyName: 'pk', sortKeyName: 'sk' } }
   */
  indexes: { default: TableIndex } & Record<string, TableIndex>;
  cursorSecret?: string; // used to mask the lastEvaluatedKey in query result
}

export enum ConditionExpressionKind {
  Comparison = 'comparison',
  AndOr = 'AND_OR',
}

type ConditionExpressionItem = {
  kind: ConditionExpressionKind.Comparison;
  key: string;
  comparator: FilterOperators;
  value: string | number | boolean | Array<number>;
};

type AndOrExpression = {
  kind: ConditionExpressionKind.AndOr;
  value: 'AND' | 'OR';
};

export type ConditionExpressionInput =
  | ConditionExpressionItem
  | AndOrExpression;

export interface ConditionExpressionReturn {
  expression: DocumentClient.ConditionExpression;
  attrValues: DocumentClient.ExpressionAttributeValueMap;
  attrNames: DocumentClient.ExpressionAttributeNameMap;
}

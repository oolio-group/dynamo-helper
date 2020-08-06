import {
  AnyObject,
  DynamoDBOperators,
  Filter,
  FilterOperators,
  Where,
  QueryInput,
} from "../types";

/**
 * Lookup for filter operator and DynamoDB supported operator
 * @param operator to lookup
 * @returns {DynamoDBOperators} dynamo db operator
 */
function keyOperatorLookup(operator: FilterOperators): DynamoDBOperators {
  switch (operator) {
    case "eq":
      return "=";
    case "neq":
      return "<>";
    case "lt":
      return "<";
    case "lte":
      return "<=";
    case "gt":
      return ">";
    case "gte":
      return ">=";
    case "inq":
      return "IN";
    case "between":
      return "BETWEEN";
    case "like":
      return "CONTAINS";
    case "beginsWith":
      return "BEGINS_WITH";
    default:
      return "=";
  }
}

/**
 * Input param validator. Returns error message if any validation error occurs
 * @param filter Input filter params
 * @param partitionKeyName partition key
 * @param sortKeyName sort key
 * @returns null if there are no error. String if there are errors
 */
function validateInput<T extends object = AnyObject>(
  filter: Filter<T>,
  partitionKeyName: string,
  sortKeyName: string
): string | null {
  if (!filter || typeof filter !== "object") {
    return `Expected one argument of type Filter<T> received ${typeof filter}`;
  } else if (
    typeof partitionKeyName !== "string" &&
    typeof sortKeyName !== "string"
  ) {
    return `Expected three arguments of type Filter<T>, string, string received ${typeof filter}, ${typeof partitionKeyName}, ${typeof sortKeyName}`;
  } else if (typeof partitionKeyName !== "string") {
    return `Expected two arguments of type Filter<T>, string, received ${typeof filter}, ${typeof partitionKeyName}`;
  } else if (typeof sortKeyName !== "string") {
    return `Expected three arguments of type Filter<T>, string, string received ${typeof filter}, ${typeof partitionKeyName}, ${typeof sortKeyName}`;
  } else if (!partitionKeyName || !sortKeyName) {
    return "Expected $partitionKeyName(string), $sortKeyName(string) to not be empty";
  }

  // Validate filter
  if (!filter.where || typeof filter.where !== "object") {
    return "Partition key condition is required for query operation";
  }

  if (filter.where && filter.where[partitionKeyName] === undefined) {
    return "Partition key condition is required for query operation";
  } else if (
    filter.where &&
    typeof filter.where[partitionKeyName] !== "string"
  ) {
    return "Partition key condition can only be a string";
  }

  if (
    filter.limit !== undefined &&
    (typeof filter.limit !== "number" || filter.limit <= 0)
  ) {
    return "Limit should be a number greater than 0";
  }

  return null;
}

function buildConditionExpressions<T extends object = AnyObject>(
  where: Where<T>,
  partitionKeyName: string,
  sortKeyName: string
): Partial<QueryInput> {
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const keyConditionExpression = [];
  const filterExpression = [];

  // extract the conditions
  Object.keys(where).forEach((key) => {
    let condition = where[key];
    const keyName = `#${key.toUpperCase()}`;

    expressionAttributeNames[keyName] = key;

    const valueExpression = `:${key}`;

    if (key === partitionKeyName) {
      keyConditionExpression.push(`${keyName} = ${valueExpression}`);
      expressionAttributeValues[valueExpression] = condition;
    } else if (key === sortKeyName) {
      if (condition && condition.constructor.name === "Object") {
        const insideKey = Object.keys(condition)[0];
        condition = condition[insideKey];
        const operator = keyOperatorLookup(insideKey as FilterOperators);
        if (operator === "BETWEEN") {
          // eslint-disable-next-line prefer-destructuring
          expressionAttributeValues[`${valueExpression}_start`] = condition[0];
          // eslint-disable-next-line prefer-destructuring
          expressionAttributeValues[`${valueExpression}_end`] = condition[1];
          keyConditionExpression.push(
            `${keyName} ${operator} ${valueExpression}_start` +
              ` AND ${valueExpression}_end`
          );
        } else if (operator === "BEGINS_WITH") {
          expressionAttributeValues[valueExpression] = condition;
          keyConditionExpression.push(
            `${operator.toLowerCase()}(${keyName}, ${valueExpression})`
          );
        } else {
          expressionAttributeValues[valueExpression] = condition;
          keyConditionExpression.push(
            `${keyName} ${operator} ${valueExpression}`
          );
        }
      } else if (condition && condition.constructor.name === "Array") {
        // eslint-disable-next-line prefer-destructuring
        expressionAttributeValues[`${valueExpression}_start`] = condition[0];
        // eslint-disable-next-line prefer-destructuring
        expressionAttributeValues[`${valueExpression}_end`] = condition[1];
        keyConditionExpression.push(
          `${keyName} BETWEEN ${valueExpression}_start` +
            ` AND ${valueExpression}_end`
        );
      } else {
        expressionAttributeValues[valueExpression] = condition;
        keyConditionExpression.push(`${keyName} = ${valueExpression}`);
      }
    } else if (condition && condition.constructor.name === "Object") {
      const insideKey = Object.keys(condition)[0];
      condition = condition[insideKey];
      const operator = keyOperatorLookup(insideKey as FilterOperators);
      if (operator === "BETWEEN") {
        // eslint-disable-next-line prefer-destructuring
        expressionAttributeValues[`${valueExpression}_start`] = condition[0];
        // eslint-disable-next-line prefer-destructuring
        expressionAttributeValues[`${valueExpression}_end`] = condition[1];
        filterExpression.push(
          `${keyName} ${operator} ${valueExpression}_start` +
            ` AND ${valueExpression}_end`
        );
      } else if (operator === "IN") {
        expressionAttributeValues[valueExpression] = `(${condition.join(",")})`;
        filterExpression.push(`${keyName} ${operator} ${valueExpression}`);
      } else if (operator === "CONTAINS") {
        expressionAttributeValues[valueExpression] = condition;
        filterExpression.push(
          `${operator.toLowerCase()}(${keyName}, ${valueExpression})`
        );
      } else {
        expressionAttributeValues[valueExpression] = condition;
        filterExpression.push(`${keyName} ${operator} ${valueExpression}`);
      }
    } else if (condition && condition.constructor.name === "Array") {
      expressionAttributeValues[valueExpression] = `(${condition.join(",")})`;
      filterExpression.push(`${keyName} IN ${valueExpression}`);
    } else {
      expressionAttributeValues[valueExpression] = condition;
      filterExpression.push(`${keyName} = ${valueExpression}`);
    }
  });

  const tableParams = {
    KeyConditionExpression: keyConditionExpression.join(" AND "),
    FilterExpression: filterExpression.join(" AND "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  } as Partial<QueryInput>;

  if (!tableParams.FilterExpression) {
    delete tableParams.FilterExpression;
  }

  return tableParams;
}

/**
 * Creates DynamoDB Table Query Input params from filter expression given
 * Note: Output does not include TableName or IndexName
 * If pk and sk condition are given as string then they are matched using KeyConditionExpression
 * Otherwise via FilterCondition (which should be used with SCAN operation)
 * @param {Filter<T>} filter for querying data
 * @param {string} partitionKeyName name of partition key to be matched (default: pk)
 * @param {string} sortKeyName name of sort key to be matched (default: sk)
 * @returns { QueryInput } table query params
 */
export function buildQueryTableParams<T extends object = AnyObject>(
  filter: Filter<T>,
  partitionKeyName = "pk",
  sortKeyName = "sk"
): QueryInput {
  // Strictly validate argument type
  const errors = validateInput(filter, partitionKeyName, sortKeyName);

  if (errors) {
    throw new Error(errors);
  }

  // Construct query for Amazon DynamoDB
  // Extract keys and filter conditions
  const tableParams = buildConditionExpressions(
    filter.where,
    partitionKeyName,
    sortKeyName
  ) as QueryInput;

  // Add projection attribute expressions
  // if at least one field is provided filter is applied
  if (filter.fields && filter.fields.length > 0) {
    const fields = [...filter.fields, partitionKeyName, sortKeyName];
    tableParams.ProjectionExpression = fields.join(",");
  }

  // Apply limit parameter. If set result will only contain X number of items
  if (filter.limit) {
    tableParams.Limit = filter.limit;
  }

  return tableParams;
}

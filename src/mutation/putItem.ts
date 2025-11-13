import { AnyObject, TableConfig, ConditionExpressionInput, ConditionExpressionKind } from '../types';
import { DynamoDBDocumentClient, PutCommand, PutCommandOutput, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { keyOperatorLookup } from '../query/queryBuilder';

const buildConditionExpressions = (
  conditionExpression: ConditionExpressionInput[],
): { expression: string; attrValues: Record<string, unknown>; attrNames: Record<string, string> } => {
  let expression = '';
  const attrValues: Record<string, unknown> = {};
  const attrNames: Record<string, string> = {};
  for (let i = 0; i < conditionExpression.length; i++) {
    const currentExpression = conditionExpression[i];
    if (currentExpression.kind === ConditionExpressionKind.AndOr) {
      if (i > 0) {
        expression += ` ${currentExpression.value} `;
      }
      continue;
    }
    if (currentExpression.kind === ConditionExpressionKind.Comparison) {
      const key = currentExpression.key;
      const comparator = currentExpression.comparator;
      const value = currentExpression.value;

      if (!comparator) continue;
      const operator = keyOperatorLookup(comparator);
      const expressionName = `#key_${key}`;
      attrNames[expressionName] = key;

      if (operator === 'BETWEEN') {
        expression += `${expressionName} ${operator} :val${i}_1 AND :val${i}_2`;
        attrValues[`:val${i}_1`] = value[0];
        attrValues[`:val${i}_2`] = value[1];
      } else if (operator === 'EXISTS') {
        // For EXISTS, we don't need a value, just check if attribute exists or not
        const existsValue = value as boolean;
        if (existsValue) {
          expression += `attribute_exists(${expressionName})`;
        } else {
          expression += `attribute_not_exists(${expressionName})`;
        }
      } else {
        expression += `${expressionName} ${operator} :val${i}`;
        attrValues[`:val${i}`] = value;
      }
    }
  }
  return { expression, attrValues, attrNames };
};

/**
 * Writes item in database.
 * If provided keys already exists then it is replaced
 * @param item object to put
 * @param conditions optional conditional expressions to prevent overwriting existing items
 */
export async function putItem<T extends AnyObject>(
  dbClient: DynamoDBDocumentClient,
  table: TableConfig,
  item: T,
  conditions?: ConditionExpressionInput[]
): Promise<PutCommandOutput> {
  if (item === null || item === undefined) {
    throw new Error(`Expected on argument of type object received ${item}`);
  } else if (typeof item !== 'object') {
    throw new Error(
      `Expected on argument of type object received ${typeof item}`
    );
  }

  const params: PutCommandInput = {
    Item: item,
    TableName: table.name,
  };

  if (conditions && conditions.length > 0) {
    const conditionExpr = buildConditionExpressions(conditions);
    params.ConditionExpression = conditionExpr.expression;
    params.ExpressionAttributeNames = conditionExpr.attrNames;
    if (Object.keys(conditionExpr.attrValues).length > 0) {
      params.ExpressionAttributeValues = conditionExpr.attrValues;
    }
  }

  return dbClient.send(new PutCommand(params));
}

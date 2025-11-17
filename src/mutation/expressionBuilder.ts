import { ConditionExpressionInput, ConditionExpressionKind, ConditionExpressionReturn } from '../types';
import { keyOperatorLookup } from '../query/queryBuilder';

/**
 * Builds DynamoDB condition expressions from structured condition input
 * @param conditionExpression Array of condition expressions
 * @returns Object containing the condition expression string and attribute names/values
 */
export const buildConditionExpressions = (
  conditionExpression: ConditionExpressionInput[],
): ConditionExpressionReturn => {
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
 * Builds DynamoDB update expressions from an item object
 * @param item Object containing attributes to update
 * @returns Object containing the update expression string and attribute names/values
 */
export const buildUpdateExpressions = (item: object): ConditionExpressionReturn => {
  const expressions = [];
  const expressionValues = {};
  const expressionNames = {};

  Object.keys(item)?.forEach(key => {
    expressions.push(`#key_${key} = :val_${key}`);
    expressionNames[`#key_${key}`] = key;
    expressionValues[`:val_${key}`] = item[key];
  });

  return {
    expression: `SET ${expressions.join(', ')}`,
    attrValues: expressionValues,
    attrNames: expressionNames,
  };
};

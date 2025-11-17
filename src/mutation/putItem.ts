import { AnyObject, TableConfig, ConditionExpressionInput } from '../types';
import { DynamoDBDocumentClient, PutCommand, PutCommandOutput, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { buildConditionExpressions } from './expressionBuilder';



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

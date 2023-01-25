import { testClient, testTableConf } from '../testUtils';
import { updateItem as conditionalUpdateItem } from './updateItem';
import { ConditionExpressionInput, ConditionExpressionKind } from '../types';

describe('updateItem', () => {
  const updateItem = conditionalUpdateItem.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'update');

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  it('should update item in table when conditions are met', async () => {
    // Values to update (item)
    const key = { pk: 'user_123' };

    // conditions to match
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'id',
        comparator: 'eq',
        value: '123',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'OR' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'name',
        comparator: 'eq',
        value: 'Gru',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'AND' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'age',
        comparator: 'gt',
        value: 20,
      },
    ];

    const attributesToUpdate = { name: 'Dru', age: 30 };
    await updateItem(key, conditions, attributesToUpdate);

    expect(spy).toHaveBeenCalledWith({
      ConditionExpression:
        'id undefined :val0 OR name undefined :val2 AND age undefined :val4',
      ExpressionAttributeValues: {
        ':val0': { N: '123' },
        ':val2': { N: 'Gru' },
        ':val4': { N: '20' },
      },
      Key: { pk: 'user_123' },
      TableName: 'sample-table',
      UpdateExpression: 'SET name = :Dru, age = :30',
    });
  });

  it('should throw error when conditions are not met', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Item: {},
        err: new Error('Conditions failed'),
      }),
    });

    const key = { pk: 'user_123' };
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'id',
        comparator: 'eq',
        value: '123',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'OR' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'name',
        comparator: 'eq',
        value: 'Gru',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'AND' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'age',
        comparator: 'gt',
        value: 20,
      },
    ];
    const attributesToUpdate = { name: 'Dru', age: 30 };

    const result = await updateItem(key, conditions, attributesToUpdate);

    expect(result).toStrictEqual({
      Item: {},
      err: new Error('Conditions failed'),
    });
  });

  it('should throw error when key is missing or invalid', async () => {
    const item = { id: '456', name: 'Bob', age: 25 };
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'id',
        comparator: 'eq',
        value: '123',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'OR' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'name',
        comparator: 'eq',
        value: 'Kevin',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'OR' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'age',
        comparator: 'gt',
        value: 20,
      },
    ];

    let error;
    try {
      await updateItem(undefined, conditions, item);
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.message).toEqual(
      'Expected key to be of type object and not empty',
    );
  });

  it('should throw error when request failed', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue({}),
    });

    const key = { pk: 'user_123' };
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'id',
        comparator: 'eq',
        value: '123',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'OR' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'name',
        comparator: 'eq',
        value: 'Gru',
      },
      { kind: ConditionExpressionKind.AndOr, value: 'AND' },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'age',
        comparator: 'gt',
        value: 20,
      },
    ];
    const attributesToUpdate = { name: 'Dru', age: 30 };

    await expect(
      updateItem(key, conditions, attributesToUpdate),
    ).rejects.toStrictEqual({});
  });
});

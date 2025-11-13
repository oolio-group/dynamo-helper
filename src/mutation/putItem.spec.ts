import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { putItem as putItemMethod } from './putItem';
import { ConditionExpressionKind } from '../types';

describe('putItem', () => {
  const putItem = putItemMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockResolvedValue({});
  });

  test('validates input', async () => {
    await expect(putItem(undefined)).rejects.toThrowError(
      'Expected on argument of type object received undefined',
    );
    await expect(putItem('' as never)).rejects.toThrowError(
      'Expected on argument of type object received string',
    );
    await expect(putItem(2 as never)).rejects.toThrowError(
      'Expected on argument of type object received number',
    );
    await expect(putItem(null)).rejects.toThrowError(
      'Expected on argument of type object received null',
    );
    await expect(putItem(NaN as never)).rejects.toThrowError(
      'Expected on argument of type object received number',
    );
  });

  test('uses put to write item to db', async () => {
    await putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Item: { pk: 'xxxx', sk: 'yyyy', id: 'xxxx' },
        TableName: testTableConf.name,
      }
    }));
  });

  test('promise rejection', async () => {
    spy.mockRejectedValue({});

    await expect(
      putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' }),
    ).rejects.toStrictEqual({});
  });

  test('puts item with condition expression to prevent overwrite', async () => {
    const conditions = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists' as const,
        value: false,
      },
    ];

    await putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' }, conditions);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        Item: { pk: 'xxxx', sk: 'yyyy', id: 'xxxx' },
        TableName: testTableConf.name,
        ConditionExpression: 'attribute_not_exists(#key_pk)',
        ExpressionAttributeNames: { '#key_pk': 'pk' },
      })
    }));
  });

  test('puts item with multiple condition expressions', async () => {
    const conditions = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists' as const,
        value: false,
      },
      {
        kind: ConditionExpressionKind.AndOr,
        value: 'OR' as const,
      },
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'status',
        comparator: 'eq' as const,
        value: 'inactive',
      },
    ];

    await putItem({ pk: 'xxxx', sk: 'yyyy', status: 'active' }, conditions);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        Item: { pk: 'xxxx', sk: 'yyyy', status: 'active' },
        TableName: testTableConf.name,
        ConditionExpression: 'attribute_not_exists(#key_pk) OR #key_status = :val2',
        ExpressionAttributeNames: { '#key_pk': 'pk', '#key_status': 'status' },
        ExpressionAttributeValues: { ':val2': 'inactive' },
      })
    }));
  });

  test('puts item with attribute_exists condition', async () => {
    const conditions = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists' as const,
        value: true,
      },
    ];

    await putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' }, conditions);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        Item: { pk: 'xxxx', sk: 'yyyy', id: 'xxxx' },
        TableName: testTableConf.name,
        ConditionExpression: 'attribute_exists(#key_pk)',
        ExpressionAttributeNames: { '#key_pk': 'pk' },
      })
    }));
  });

  test('puts item with comparison condition', async () => {
    const conditions = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'version',
        comparator: 'lt' as const,
        value: 5,
      },
    ];

    await putItem({ pk: 'xxxx', sk: 'yyyy', version: 6 }, conditions);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        Item: { pk: 'xxxx', sk: 'yyyy', version: 6 },
        TableName: testTableConf.name,
        ConditionExpression: '#key_version < :val0',
        ExpressionAttributeNames: { '#key_version': 'version' },
        ExpressionAttributeValues: { ':val0': 5 },
      })
    }));
  });

  test('puts item with between condition', async () => {
    const conditions = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'price',
        comparator: 'between' as const,
        value: [10, 100],
      },
    ];

    await putItem({ pk: 'xxxx', sk: 'yyyy', price: 50 }, conditions);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        Item: { pk: 'xxxx', sk: 'yyyy', price: 50 },
        TableName: testTableConf.name,
        ConditionExpression: '#key_price BETWEEN :val0_1 AND :val0_2',
        ExpressionAttributeNames: { '#key_price': 'price' },
        ExpressionAttributeValues: { ':val0_1': 10, ':val0_2': 100 },
      })
    }));
  });
});

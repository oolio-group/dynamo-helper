import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { transactWriteItems as transactWriteItemsMethod } from './transactWriteItems';
import { ConditionExpressionInput, ConditionExpressionKind } from '../types';

describe('transactWriteItems', () => {
  const transactWriteItems = transactWriteItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockResolvedValue({});
  });

  afterEach(() => {
    spy.mockClear();
  });

  test('exports function', () => {
    expect(typeof transactWriteItems).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockRejectedValue(new Error('Transaction failed'));

    await expect(
      transactWriteItems([
        { Put: { Item: { pk: 'xxxx', sk: 'yyyy', id: 'xxxx' } } },
      ]),
    ).rejects.toThrow('Transaction failed');
  });

  test('handles Put operations', async () => {
    await transactWriteItems([
      { Put: { Item: { pk: '1', sk: 'a', id: '1' } } },
      { Put: { Item: { pk: '2', sk: 'b', id: '2' } } },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Put: {
              Item: { pk: '1', sk: 'a', id: '1' },
              TableName: testTableConf.name,
            },
          },
          {
            Put: {
              Item: { pk: '2', sk: 'b', id: '2' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Delete operations', async () => {
    await transactWriteItems([
      { Delete: { Key: { pk: '1', sk: 'a' } } },
      { Delete: { Key: { pk: '2', sk: 'b' } } },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Delete: {
              Key: { pk: '1', sk: 'a' },
              TableName: testTableConf.name,
            },
          },
          {
            Delete: {
              Key: { pk: '2', sk: 'b' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Update operations', async () => {
    await transactWriteItems([
      {
        Update: {
          Key: { pk: '1', sk: 'a' },
          Item: { name: 'John' },
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Update: {
              Key: { pk: '1', sk: 'a' },
              UpdateExpression: 'SET #key_name = :val_name',
              ExpressionAttributeNames: { '#key_name': 'name' },
              ExpressionAttributeValues: { ':val_name': 'John' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles ConditionCheck operations', async () => {
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists',
        value: true,
      },
    ];

    await transactWriteItems([
      {
        ConditionCheck: {
          Key: { pk: '1', sk: 'a' },
          conditions,
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            ConditionCheck: {
              Key: { pk: '1', sk: 'a' },
              TableName: testTableConf.name,
              ConditionExpression: '#key_pk EXISTS :val0',
              ExpressionAttributeNames: { '#key_pk': 'pk' },
              ExpressionAttributeValues: { ':val0': true },
            },
          },
        ],
      }
    }));
  });

  test('handles mixed operation types', async () => {
    await transactWriteItems([
      { Put: { Item: { pk: '1', sk: 'a', name: 'Alice' } } },
      { Delete: { Key: { pk: '2', sk: 'b' } } },
      {
        Update: {
          Key: { pk: '3', sk: 'c' },
          Item: { status: 'active' },
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Put: {
              Item: { pk: '1', sk: 'a', name: 'Alice' },
              TableName: testTableConf.name,
            },
          },
          {
            Delete: {
              Key: { pk: '2', sk: 'b' },
              TableName: testTableConf.name,
            },
          },
          {
            Update: {
              Key: { pk: '3', sk: 'c' },
              UpdateExpression: 'SET #key_status = :val_status',
              ExpressionAttributeNames: { '#key_status': 'status' },
              ExpressionAttributeValues: { ':val_status': 'active' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Put with conditions', async () => {
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists',
        value: false,
      },
    ];

    await transactWriteItems([
      {
        Put: {
          Item: { pk: '1', sk: 'a', name: 'Alice' },
          conditions,
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Put: {
              Item: { pk: '1', sk: 'a', name: 'Alice' },
              ConditionExpression: '#key_pk EXISTS :val0',
              ExpressionAttributeNames: { '#key_pk': 'pk' },
              ExpressionAttributeValues: { ':val0': false },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Delete with conditions', async () => {
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: 'exists',
        value: true,
      },
    ];

    await transactWriteItems([
      {
        Delete: {
          Key: { pk: '1', sk: 'a' },
          conditions,
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Delete: {
              Key: { pk: '1', sk: 'a' },
              ConditionExpression: '#key_pk EXISTS :val0',
              ExpressionAttributeNames: { '#key_pk': 'pk' },
              ExpressionAttributeValues: { ':val0': true },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Update with conditions', async () => {
    const conditions: ConditionExpressionInput[] = [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'version',
        comparator: 'eq',
        value: 1,
      },
    ];

    await transactWriteItems([
      {
        Update: {
          Key: { pk: '1', sk: 'a' },
          Item: { name: 'Bob', version: 2 },
          conditions,
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Update: {
              Key: { pk: '1', sk: 'a' },
              UpdateExpression: 'SET #key_name = :val_name, #key_version = :val_version',
              ConditionExpression: '#key_version = :val0',
              ExpressionAttributeNames: {
                '#key_name': 'name',
                '#key_version': 'version',
              },
              ExpressionAttributeValues: {
                ':val_name': 'Bob',
                ':val_version': 2,
                ':val0': 1,
              },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });
});

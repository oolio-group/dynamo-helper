import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { transactWriteItems as transactWriteItemsMethod } from './transactWriteItems';

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
          UpdateExpression: 'SET #name = :val',
          ExpressionAttributeNames: { '#name': 'name' },
          ExpressionAttributeValues: { ':val': 'John' },
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Update: {
              Key: { pk: '1', sk: 'a' },
              UpdateExpression: 'SET #name = :val',
              ExpressionAttributeNames: { '#name': 'name' },
              ExpressionAttributeValues: { ':val': 'John' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles ConditionCheck operations', async () => {
    await transactWriteItems([
      {
        ConditionCheck: {
          Key: { pk: '1', sk: 'a' },
          TableName: testTableConf.name,
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: { '#pk': 'pk' },
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
              ConditionExpression: 'attribute_exists(#pk)',
              ExpressionAttributeNames: { '#pk': 'pk' },
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
          UpdateExpression: 'SET #status = :val',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':val': 'active' },
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
              UpdateExpression: 'SET #status = :val',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':val': 'active' },
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('preserves custom TableName if provided', async () => {
    const customTableName = 'custom-table';
    await transactWriteItems([
      { Put: { Item: { pk: '1', sk: 'a' }, TableName: customTableName } },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Put: {
              Item: { pk: '1', sk: 'a' },
              TableName: customTableName,
            },
          },
        ],
      }
    }));
  });

  test('handles Put with conditions', async () => {
    await transactWriteItems([
      {
        Put: {
          Item: { pk: '1', sk: 'a', name: 'Alice' },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Put: {
              Item: { pk: '1', sk: 'a', name: 'Alice' },
              ConditionExpression: 'attribute_not_exists(pk)',
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });

  test('handles Delete with conditions', async () => {
    await transactWriteItems([
      {
        Delete: {
          Key: { pk: '1', sk: 'a' },
          ConditionExpression: 'attribute_exists(pk)',
        },
      },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TransactItems: [
          {
            Delete: {
              Key: { pk: '1', sk: 'a' },
              ConditionExpression: 'attribute_exists(pk)',
              TableName: testTableConf.name,
            },
          },
        ],
      }
    }));
  });
});

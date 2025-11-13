import { testClient, testTableConf } from '../testUtils';
import { Where } from '../types';
import { query as queryMethod } from './query';

describe('query', () => {
  const query = queryMethod.bind(null, testClient, testTableConf);

  jest.spyOn(testClient, 'send').mockResolvedValue({ Items: [] });

  test('with only partition key', async () => {
    await query({
      where: {
        pk: 'xxxx',
      },
    });

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        KeyConditionExpression: '#PK = :pk',
        ExpressionAttributeNames: {
          '#PK': 'pk',
        },
        ExpressionAttributeValues: {
          ':pk': 'xxxx',
        },
      }
    }));
  });

  test('input validation', async () => {
    await expect(
      query({
        where: {
          pk: {
            beginsWith: 'product',
          },
        } as Where<{ pk: string }>,
      }),
    ).rejects.toThrowError('Partition key condition can only be a string');
  });

  test('when there are no results, returns empty', async () => {
    const results = await query({
      where: {
        pk: 'xxxx',
      },
    });

    expect(results.length).toBe(0);
  });

  test('with index name specified', () => {
    query(
      {
        where: {
          sk: 'xxxx',
        },
      },
      'reverse',
    );

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        IndexName: 'reverse',
        KeyConditionExpression: '#SK = :sk',
        ExpressionAttributeNames: {
          '#SK': 'sk',
        },
        ExpressionAttributeValues: {
          ':sk': 'xxxx',
        },
      }
    }));
  });

  test('result if pagination is not enabled has all items', async () => {
    testClient.send = jest.fn().mockImplementation((command) => {
      const params = command.input;
      const isFirstRequest = params.ExclusiveStartKey === undefined;
      return Promise.resolve({
        Items: [isFirstRequest ? { id: 'xxxx' } : { id: 'yyyy' }],
        LastEvaluatedKey: isFirstRequest ? { pk: 'xxxx' } : undefined,
      });
    });

    await query({
      where: { pk: 'xxxx' },
    });
    expect(testClient.send).toHaveBeenCalledTimes(2);
  });
});

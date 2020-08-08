import { QueryInput, QueryOutput } from 'aws-sdk/clients/dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { Where } from '../types';
import { query as queryMethod } from './query';

describe('query', () => {
  const query = queryMethod.bind(null, testClient, testTableConf);

  jest.spyOn(testClient, 'query').mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Items: [] }),
  });

  test('with only partition key', async () => {
    await query({
      where: {
        pk: 'xxxx',
      },
    });

    expect(testClient.query).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
    });
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

    expect(testClient.query).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      IndexName: 'reverse',
      KeyConditionExpression: '#SK = :sk',
      ExpressionAttributeNames: {
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':sk': 'xxxx',
      },
    });
  });

  test('result if pagination is not enabled has all items', async () => {
    testClient.query = jest.fn().mockImplementation((params: QueryInput) => {
      const isFirstRequest = params.ExclusiveStartKey === undefined;
      return {
        promise: jest.fn().mockResolvedValue({
          Items: [isFirstRequest ? { id: 'xxxx' } : { id: 'yyyy' }],
          LastEvaluatedKey: isFirstRequest ? { pk: 'xxxx' } : undefined,
        } as QueryOutput),
      };
    });

    await query({
      where: { pk: 'xxxx' },
    });
    expect(testClient.query).toHaveBeenCalledTimes(2);
  });
});

import { BatchGetItemInput } from 'aws-sdk/clients/dynamodb';
import { fill } from 'lodash';
import { testClient, testTableConf } from '../testUtils';
import { batchGetItems as batchGetItemsMethod } from './batchGetItems';

describe('batchGetItems', () => {
  const batchGetItems = batchGetItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'batchGet');

  beforeEach(() => {
    spy.mockClear();
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Responses: {
          [testTableConf.name]: [],
        },
      }),
    });
  });

  test('returns list of matching items', async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);
    spy.mockImplementation((params: BatchGetItemInput) => {
      return {
        promise: jest.fn().mockResolvedValue({
          Responses: {
            [testTableConf.name]: [{ id: 'xxxx' }],
          },
        }),
      };
    });
    await expect(
      batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }]),
    ).resolves.toHaveLength(1);
  });

  test('returns empty if no result found', async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);

    await expect(
      batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }]),
    ).resolves.toHaveLength(0);
  });

  test('chunks requests into 100s', async () => {
    spy.mockImplementation((params: BatchGetItemInput) => {
      return {
        promise: jest.fn().mockResolvedValue({
          Responses: {
            [testTableConf.name]: params.RequestItems[testTableConf.name].Keys,
          },
        }),
      };
    });

    await expect(batchGetItems([{}, {}]));
    expect(spy).toHaveBeenCalledTimes(1);
    await expect(batchGetItems(fill(Array(100), {})));
    expect(spy).toHaveBeenCalledTimes(2);
    const results = await batchGetItems(fill(Array(301), {}));
    expect(spy).toHaveBeenCalledTimes(6);
    expect(results).toHaveLength(301);
  });

  test('returns all matches if pagination is not enabled', async () => {
    spy.mockImplementation((params: BatchGetItemInput) => {
      const isFirstRequest =
        params.RequestItems[testTableConf.name].Keys[0].pk === 'xxxx';
      return {
        promise: jest.fn().mockResolvedValue({
          Responses: {
            [testTableConf.name]: [
              isFirstRequest ? { id: 'xxxx' } : { id: 'yyyy' },
            ],
          },
          UnprocessedKeys: {
            [testTableConf.name]: {
              Keys: isFirstRequest ? [{ pk: 'aaaa', sk: 'bbbb' }] : [],
            },
          },
        }),
      };
    });

    await batchGetItems([
      { pk: 'xxxx', sk: 'yyyy' },
      { pk: 'aaaa', sk: 'bbbb' },
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('fields to project', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], ['id']);
    expect(spy).toHaveBeenCalledWith({
      RequestItems: {
        [testTableConf.name]: {
          Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
          ProjectionExpression: 'id',
        },
      },
    });
  });
});

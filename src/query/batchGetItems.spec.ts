import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import fill from 'lodash/fill';
import { testClient, testTableConf } from '../testUtils';
import { batchGetItems as batchGetItemsMethod } from './batchGetItems';

describe('batchGetItems', () => {
  const batchGetItems = batchGetItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockClear();
    spy.mockResolvedValue({
      Responses: {
        [testTableConf.name]: [],
      },
    });
  });

  test('returns list of matching items', async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);
    spy.mockImplementation(() => {
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: [{ id: 'xxxx' }],
        },
      });
    });
    await expect(
      batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }]),
    ).resolves.toHaveLength(1);
  });

  test('return value if no result found', async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);

    await expect(
      batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }]),
    ).resolves.toStrictEqual([undefined]);
  });

  test('chunks requests into 100s', async () => {
    spy.mockImplementation((command: any) => {
      const params = command.input;
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: params.RequestItems[testTableConf.name].Keys,
        },
      });
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
    spy.mockImplementation((command: any) => {
      const params = command.input;
      const isFirstRequest =
        params.RequestItems[testTableConf.name].Keys[0].pk === 'xxxx';
      return Promise.resolve({
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
      });
    });

    await batchGetItems([
      { pk: 'xxxx', sk: 'yyyy' },
      { pk: 'aaaa', sk: 'bbbb' },
    ]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('fields to project', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], ['id']);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
            ProjectionExpression: 'id,pk,sk',
          },
        },
      }
    }));
  });

  test('fields to project including primary keys', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], ['id', 'pk', 'sk']);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
            ProjectionExpression: 'id,pk,sk',
          },
        },
      }
    }));
  });

  test('fields to project with different key names', async () => {
    await batchGetItemsMethod(
      testClient,
      {
        ...testTableConf,
        indexes: {
          default: {
            partitionKeyName: 'key1',
            sortKeyName: 'key2',
          },
        },
      },
      [{ pk: 'xxxx', sk: 'yyyy' }],
      ['id'],
    );
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
            ProjectionExpression: 'id,key1,key2',
          },
        },
      }
    }));
  });

  test('result is in the same order as keys', async () => {
    spy.mockResolvedValueOnce({
      Responses: {
        [testTableConf.name]: [
          { pk: '5', sk: '6', id: 'c' },
          { pk: '1', sk: '2', id: 'a' },
          { pk: '3', sk: '4', id: 'b' },
        ],
      },
    });

    const result = await batchGetItems(
      [
        { pk: '1', sk: '2' },
        { pk: '3', sk: '4' },
        { pk: '5', sk: '6' },
      ],
      ['id'],
    );
    expect(result).toStrictEqual([
      { pk: '1', sk: '2', id: 'a' },
      { pk: '3', sk: '4', id: 'b' },
      { pk: '5', sk: '6', id: 'c' },
    ]);
  });

  test('consistent read set to true', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], undefined, true);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
            ConsistentRead: true,
          },
        },
      }
    }));
  });

  test('consistent read set to false', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], undefined, false);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
            ConsistentRead: false,
          },
        },
      }
    }));
  });

  test('consistent read not specified', async () => {
    await batchGetItems([{ pk: 'xxxx', sk: 'yyyy' }], undefined, undefined);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: {
            Keys: [{ pk: 'xxxx', sk: 'yyyy' }],
          },
        },
      }
    }));
    // Ensure ConsistentRead is not present in the params
    expect((spy.mock.calls[0][0] as any).input.RequestItems[testTableConf.name].ConsistentRead).toBeUndefined();
  });
});

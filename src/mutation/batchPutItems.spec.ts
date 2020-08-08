import { BatchWriteItemInput } from 'aws-sdk/clients/dynamodb';
import fill from 'lodash/fill';
import { testClient, testTableConf } from '../testUtils';
import { batchPutItems as batchPutItemsMethod } from './batchPutItems';

describe('batchPutItems', () => {
  const batchPutItems = batchPutItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'batchWrite');

  beforeEach(() => {
    spy.mockClear();
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  test('exports function', () => {
    expect(typeof batchPutItems).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });
    await expect(batchPutItems([{}, {}])).rejects.toStrictEqual([]);
  });

  test('chunks items to bits of 25 items', async () => {
    await batchPutItems([{}, {}]);
    expect(spy).toHaveBeenCalledTimes(1);

    await batchPutItems(fill(Array(50), {}));
    expect(spy).toHaveBeenCalledTimes(3);

    await batchPutItems(fill(Array(201), {}));
    expect(spy).toHaveBeenCalledTimes(12);
  });

  test('uses batchWrite correctly', async () => {
    await batchPutItems([
      { pk: 'x', sk: '1' },
      { pk: 'y', sk: '2' },
    ]);

    expect(spy).toHaveBeenCalledWith({
      RequestItems: {
        [testTableConf.name]: [
          {
            PutRequest: {
              Item: { pk: 'x', sk: '1' },
            },
          },
          {
            PutRequest: {
              Item: { pk: 'y', sk: '2' },
            },
          },
        ],
      },
    } as BatchWriteItemInput);
  });
});

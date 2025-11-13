import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import fill from 'lodash/fill';
import { testClient, testTableConf } from '../testUtils';
import { batchDeleteItems as batchDeleteItemsMethod } from './batchDeleteItems';

describe('batchDeleteItems', () => {
  const batchDeleteItems = batchDeleteItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockClear();
    spy.mockResolvedValue({});
  });

  test('exports function', () => {
    expect(typeof batchDeleteItems).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockRejectedValue([]);
    await expect(batchDeleteItems([{}, {}])).rejects.toStrictEqual([]);
  });

  test('chunks items to bits of 25 items', async () => {
    await batchDeleteItems([{}, {}]);
    expect(spy).toHaveBeenCalledTimes(1);

    await batchDeleteItems(fill(Array(50), {}));
    expect(spy).toHaveBeenCalledTimes(3);

    await batchDeleteItems(fill(Array(201), {}));
    expect(spy).toHaveBeenCalledTimes(12);
  });

  test('uses batchWrite correctly', async () => {
    await batchDeleteItems([
      { pk: 'x', sk: '1' },
      { pk: 'y', sk: '2' },
    ]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        RequestItems: {
          [testTableConf.name]: [
            {
              DeleteRequest: {
                Key: { pk: 'x', sk: '1' },
              },
            },
            {
              DeleteRequest: {
                Key: { pk: 'y', sk: '2' },
              },
            },
          ],
        },
      }
    }));
  });
});

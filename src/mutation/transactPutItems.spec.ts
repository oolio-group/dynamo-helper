import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { transactPutItems as transactPutItemsMethod } from './transactPutItems';

describe('transactPutItems', () => {
  const transactPutItems = transactPutItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockResolvedValue({});
  });

  test('exports function', () => {
    expect(typeof transactPutItems).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockRejectedValue([]);

    await expect(
      transactPutItems([{ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' }]),
    ).rejects.toStrictEqual([]);
  });

  test('uses transactWrite', async () => {
    await transactPutItems([
      { pk: '1', sk: 'a', id: '1' },
      { pk: '2', sk: 'b', id: '2' },
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
});

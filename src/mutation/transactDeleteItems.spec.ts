import { TransactWriteItemsInput } from 'aws-sdk/clients/dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { transactDeleteItems as transactDeleteItemsMethod } from './transactDeleteItems';

describe('transactDeleteItems', () => {
  const transactDeleteItems = transactDeleteItemsMethod.bind(
    null,
    testClient,
    testTableConf,
  );
  const spy = jest.spyOn(testClient, 'transactWrite');

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  test('exports function', () => {
    expect(typeof transactDeleteItems).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });

    await expect(
      transactDeleteItems([{ pk: 'xxxx', sk: 'yyyy' }]),
    ).rejects.toStrictEqual([]);
  });

  test('uses transactWrite', async () => {
    await transactDeleteItems([
      { pk: '1', sk: 'a' },
      { pk: '2', sk: 'b' },
    ]);
    expect(spy).toHaveBeenCalledWith({
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
    } as TransactWriteItemsInput);
  });
});

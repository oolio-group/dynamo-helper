import { DeleteItemInput } from 'aws-sdk/clients/dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { deleteItem as deleteItemMethod } from './deleteItem';

describe('deleteItem', () => {
  const deleteItem = deleteItemMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'delete');

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  test('exports function', () => {
    expect(typeof deleteItem).toBe('function');
  });

  test('promise rejection', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });

    await expect(deleteItem('xxxx', 'yyyy')).rejects.toStrictEqual([]);
  });

  test('uses delete correctly', async () => {
    await deleteItem('xxxx', 'yyyy');
    expect(spy).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      Key: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    } as DeleteItemInput);
  });

  test('uses key names from table index configuration', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await deleteItemMethod(
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
      'xxxx',
      'yyyy',
    );
    expect(testClient.delete).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      Key: {
        key1: 'xxxx',
        key2: 'yyyy',
      },
    });
  });
});

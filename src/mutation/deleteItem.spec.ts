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

  test('argument validation', async () => {
    await expect(deleteItem(undefined)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(deleteItem(null)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(deleteItem('null')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(deleteItem(2 as never, '')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
  });

  test('key validation', async () => {
    await expect(deleteItem({ id: 'string' })).rejects.toThrowError(
      'Invalid key: expected key to contain at least partition key',
    );
    await expect(deleteItem({ pk: 'string' })).resolves.not.toThrow();
    // Custom partition key name in table config
    await expect(
      deleteItemMethod(
        testClient,
        { ...testTableConf, indexes: { default: { partitionKeyName: 'id' } } },
        { id: 'string' },
      ),
    ).resolves.not.toThrow();
  });

  test('promise rejection', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });

    await expect(deleteItem({ pk: 'xxxx', sk: 'yyyy' })).rejects.toStrictEqual(
      [],
    );
  });

  test('uses delete correctly', async () => {
    await deleteItem({ pk: 'xxxx', sk: 'yyyy' });
    expect(spy).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      Key: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    } as DeleteItemInput);
  });
});

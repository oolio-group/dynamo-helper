import { testClient, testTableConf } from '../testUtils';
import { getItem as getItemMethod } from './getItem';

describe('getItem', () => {
  const getItem = getItemMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('argument validation', async () => {
    await expect(getItem(undefined)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(getItem(null)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(getItem('null')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(getItem(2 as never, '')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
  });

  test('key validation', async () => {
    await expect(getItem({ id: 'string' })).rejects.toThrowError(
      'Invalid key: expected key to contain at least partition key',
    );
    await expect(getItem({ pk: 'string' })).resolves.not.toThrow();
    // Custom partition key name in table config
    await expect(
      getItemMethod(
        testClient,
        { ...testTableConf, indexes: { default: { partitionKeyName: 'id' } } },
        { id: 'string' },
      ),
    ).resolves.not.toThrow();
  });

  test('returns null if item not found', async () => {
    spy.mockResolvedValue({ Item: null });

    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(getItem({ pk: 'xxxx', sk: 'yyyy' })).resolves.toBe(null);
  });

  test('returns first item if found', async () => {
    // If query result is not empty getItem returns first item in list
    spy.mockResolvedValue({ Item: { id: 'xxxx' } });

    await expect(getItem({ pk: 'xxxx', sk: 'yyyy' })).resolves.toStrictEqual({
      id: 'xxxx',
    });
  });

  test('fields to project', async () => {
    spy.mockResolvedValue({ Item: { id: 'xxxx' } });

    await getItem({ pk: 'xxxx', sk: 'yyyy' }, ['id']);
    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        Key: {
          pk: 'xxxx',
          sk: 'yyyy',
        },
        ProjectionExpression: 'id',
      }
    }));
  });

  test('consistent read set to true', async () => {
    spy.mockResolvedValue({ Item: { id: 'xxxx' } });

    await getItem({ pk: 'xxxx', sk: 'yyyy' }, undefined, true);
    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        Key: {
          pk: 'xxxx',
          sk: 'yyyy',
        },
        ConsistentRead: true,
      }
    }));
  });

  test('consistent read set to false', async () => {
    spy.mockResolvedValue({ Item: { id: 'xxxx' } });

    await getItem({ pk: 'xxxx', sk: 'yyyy' }, undefined, false);
    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        Key: {
          pk: 'xxxx',
          sk: 'yyyy',
        },
        ConsistentRead: false,
      }
    }));
  });

  test('consistent read not specified', async () => {
    spy.mockResolvedValue({ Item: { id: 'xxxx' } });

    await getItem({ pk: 'xxxx', sk: 'yyyy' }, undefined, undefined);
    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        Key: {
          pk: 'xxxx',
          sk: 'yyyy',
        },
      }
    }));
    // Ensure ConsistentRead is not present in the params
    expect((testClient.send as jest.Mock).mock.calls[0][0].input.ConsistentRead).toBeUndefined();
  });
});

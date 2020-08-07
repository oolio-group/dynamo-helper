import { testClient, testTableConf } from '../testUtils';
import { getItem as getItemMethod } from './getItem';

describe('getItem', () => {
  const getItem = getItemMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'get');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates arguments', async () => {
    await expect(getItem(undefined, undefined)).rejects.toThrowError(
      'Expected two arguments of type string, string received undefined, undefined',
    );
    await expect(getItem(null, null)).rejects.toThrowError(
      'Expected two arguments of type string, string received object, object',
    );
    await expect(getItem('null', null)).rejects.toThrowError(
      'Expected two arguments of type string, string received string, object',
    );
    await expect(getItem(undefined, '')).rejects.toThrowError(
      'Expected two arguments of type string, string received undefined, string',
    );
    await expect(getItem(2 as never, '')).rejects.toThrowError(
      'Expected two arguments of type string, string received number, string',
    );
    await expect(getItem('', '')).rejects.toThrowError(
      'Expected both arguments to have length greater than 0',
    );
  });

  test('returns null if item not found', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: null }),
    });

    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(getItem('xxxx', 'yyyy')).resolves.toBe(null);
  });

  test('returns first item if found', async () => {
    // If query result is not empty getItem returns first item in list
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await expect(getItem('xxxx', 'yyyy')).resolves.toStrictEqual({
      id: 'xxxx',
    });
  });

  test('fields to project', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await getItem('xxxx', 'yyyy', ['id']);
    expect(testClient.get).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      Key: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      ProjectionExpression: 'id',
    });
  });

  test('uses key names from table index configuration', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await getItemMethod(
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
      ['id'],
    );
    expect(testClient.get).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      Key: {
        key1: 'xxxx',
        key2: 'yyyy',
      },
      ProjectionExpression: 'id',
    });
  });
});

import { PutItemInput } from 'aws-sdk/clients/dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { putItem as putItemMethod } from './putItem';

describe('putItem', () => {
  const putItem = putItemMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'put');

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  test('validates input', async () => {
    await expect(putItem(undefined)).rejects.toThrowError(
      'Expected on argument of type object received undefined',
    );
    await expect(putItem('' as never)).rejects.toThrowError(
      'Expected on argument of type object received string',
    );
    await expect(putItem(2 as never)).rejects.toThrowError(
      'Expected on argument of type object received number',
    );
    await expect(putItem(null)).rejects.toThrowError(
      'Expected on argument of type object received null',
    );
    await expect(putItem(NaN as never)).rejects.toThrowError(
      'Expected on argument of type object received number',
    );
  });

  test('uses put to write item to db', async () => {
    await putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' });
    expect(spy).toHaveBeenCalledWith({
      Item: { pk: 'xxxx', sk: 'yyyy', id: 'xxxx' },
      TableName: testTableConf.name,
    } as PutItemInput);
  });

  test('promise rejection', async () => {
    spy.mockReturnValue({
      promise: jest.fn().mockRejectedValue({}),
    });

    await expect(
      putItem({ pk: 'xxxx', sk: 'yyyy', id: 'xxxx' }),
    ).rejects.toStrictEqual({});
  });
});

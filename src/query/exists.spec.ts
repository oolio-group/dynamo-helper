import { testClient, testTableConf } from '../testUtils';
import { exists as existsMethod } from './exists';

describe('exists', () => {
  const exists = existsMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'get');

  beforeEach(() => {
    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: null }),
    });
  });

  test('validates arguments', async () => {
    await expect(exists(undefined)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(exists(null)).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(exists('null')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
    await expect(exists(2 as never, '')).rejects.toThrowError(
      'Expected key to be of type object and not empty',
    );
  });

  test('returns boolean value', async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(exists({ pk: 'xxxx', sk: 'yyyy' })).resolves.toBe(false);

    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await expect(exists({ pk: 'xxxx', sk: 'yyyy' })).resolves.toBe(true);
  });
});

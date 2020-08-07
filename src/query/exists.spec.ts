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
    await expect(exists(undefined, undefined)).rejects.toThrowError(
      'Expected two arguments of type string, string received undefined, undefined',
    );
    await expect(exists(null, null)).rejects.toThrowError(
      'Expected two arguments of type string, string received object, object',
    );
    await expect(exists('null', null)).rejects.toThrowError(
      'Expected two arguments of type string, string received string, object',
    );
    await expect(exists(undefined, '')).rejects.toThrowError(
      'Expected two arguments of type string, string received undefined, string',
    );
    await expect(exists(2 as never, '')).rejects.toThrowError(
      'Expected two arguments of type string, string received number, string',
    );
    await expect(exists('', '')).rejects.toThrowError(
      'Expected both arguments to have length greater than 0',
    );
  });

  test('returns boolean value', async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(exists('xxxx', 'yyyy')).resolves.toBe(false);

    spy.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: { id: 'xxxx' } }),
    });

    await expect(exists('xxxx', 'yyyy')).resolves.toBe(true);
  });
});

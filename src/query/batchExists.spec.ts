import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import range from 'lodash/range';
import { testClient, testTableConf } from '../testUtils';
import { batchExists as batchExistsMethod } from './batchExists';

describe('batchExists', () => {
  const batchExists = batchExistsMethod.bind(null, testClient, testTableConf);
  const spy = jest.spyOn(testClient, 'send');

  beforeEach(() => {
    spy.mockClear();
    spy.mockImplementation((command: any) => {
      const params = command.input;
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: params.RequestItems[testTableConf.name].Keys,
        },
      });
    });
  });

  beforeEach(() => {
    spy.mockImplementation((command: any) => {
      const params = command.input;
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: params.RequestItems[testTableConf.name].Keys,
        },
      });
    });
  });
  test('returns empty if all keys exist', async () => {
    await expect(
      batchExists([
        { pk: '1', sk: '2' },
        { pk: '3', sk: '4' },
      ]),
    ).resolves.toHaveLength(0);
  });

  test('returns not found keys if not all items exist', async () => {
    spy.mockImplementation((command: any) => {
      const params = command.input;
      const keys = params.RequestItems[testTableConf.name].Keys;
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: keys.slice(0, 1),
        },
      });
    });

    await expect(
      batchExists([
        { pk: '1', sk: '2' },
        { pk: '3', sk: '4' },
      ]),
    ).resolves.toEqual([{ pk: '3', sk: '4' }]);
  });

  test('with 100 items', async () => {
    spy.mockImplementation((command: any) => {
      const params = command.input;
      const keys = params.RequestItems[testTableConf.name].Keys;
      return Promise.resolve({
        Responses: {
          [testTableConf.name]: keys.slice(0, Math.floor(keys.length / 2)),
        },
      });
    });

    const keys = range(100).map((i: string) => ({
      pk: i + 'pk',
      sk: i + 'sk',
    }));

    await expect(batchExists(keys)).resolves.toEqual(keys.slice(50));
  });
});

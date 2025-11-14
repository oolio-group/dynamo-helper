/* eslint-disable @typescript-eslint/no-explicit-any */
import { testClient, testTableConf } from '../testUtils';
import { Direction, Where } from '../types';
import { queryWithCursor } from './queryWithCursor';

describe('queryWithCursor', () => {
  const query = queryWithCursor.bind(null, testClient, {
    ...testTableConf,
    cursorSecret: 'secret',
  });
  let mockQuery: jest.SpyInstance;
  beforeEach(() => {
    mockQuery = jest.spyOn(testClient, 'send').mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });
  });

  afterEach(() => {
    mockQuery.mockRestore();
    jest.clearAllMocks();
  });

  it('should throw an error when sort key is not defined on table', async () => {
    const queryWithoutSk = queryWithCursor.bind(null, testClient, {
      ...testTableConf,
      indexes: {
        ...testTableConf.indexes,
        default: {
          partitionKeyName: 'pk',
        },
      },
    });
    await expect(
      queryWithoutSk({
        where: {
          pk: 'xxxx',
        },
      }),
    ).rejects.toThrowError('Expected sortKey to query');

    expect(testClient.send).toHaveBeenCalledTimes(0);
  });

  it('should throw an error when invalid partition key is supplied', async () => {
    await expect(
      query({
        where: {
          pk: {
            beginsWith: 'product',
          },
        } as Where<{ pk: string }>,
      }),
    ).rejects.toThrowError('Partition key condition can only be a string');
  });

  it('should throw an error when secret is not configured', async () => {
    const queryWithoutSk = queryWithCursor.bind(null, testClient, {
      ...testTableConf,
      cussorSecret: undefined,
    });
    await expect(
      queryWithoutSk({
        where: {
          pk: 'product',
        } as Where<{ pk: string }>,
      }),
    ).rejects.toThrowError(
      'Expected `cursorSecret` which is used to encrypt the `LastEvaluatedKey`',
    );
  });

  it('should return empty, when there are no items available in table', async () => {
    const results = await query({
      where: {
        pk: 'xxxx',
      },
    });

    expect(results.items).toHaveLength(0);
    expect(results.cursor).toBeUndefined();
  });

  it('should be called with index name specified', () => {
    query(
      {
        where: {
          sk: 'xxxx',
        },
      },
      'reverse',
    );

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        IndexName: 'reverse',
        KeyConditionExpression: '#SK = :sk',
        ExpressionAttributeNames: {
          '#SK': 'sk',
        },
        ExpressionAttributeValues: {
          ':sk': 'xxxx',
        },
        Limit: 99999,
        ExclusiveStartKey: undefined,
      }
    }));
  });
});

interface Item {
  pk: string;
  sk: string;
}
const TOTAL_RECORDS = 150;
const STATUS_DICT = [
  'COMPLETED',
  'IN_PROGRESS',
  'CANCELLED',
  'PENDING',
  'FAILED',
];
const USERS = [
  'Gru',
  'Dru',
  'Minions',
  'Bob',
  'Max',
  'Kevin',
  'Dev',
  'Stuart',
  'Lakki',
];
const randomNo = (start: number, end: number): number =>
  Math.floor(Math.random() * end) + start;
const generateItems = () =>
  new Array(TOTAL_RECORDS)
    .fill(0)
    .map((item, i) => {
      const date = new Date(2021, randomNo(1, 6), i);
      const status =
        STATUS_DICT[Math.floor(Math.random() * STATUS_DICT.length)];
      return [
        {
          pk: 'pk#products',
          sk: `sk#${date.getFullYear()}#${date.getMonth()}#${date.getDate()}+${
            Math.floor(Math.random() * 6000) + 1000
          }`,
        },
        {
          pk: `pk#order#${status}`,
          sk: `${date.getFullYear()}#${date.getMonth()}#${date.getDate()}`,
          createdBy: USERS[Math.floor(Math.random() * USERS.length)],
        },
      ];
    })
    .flat();
const ITEMS = generateItems();

class DynamoDBPaginateQueryMockImpl {
  private _records: Item[] = [];
  private _processed = 0;
  private _lastEvaluatedKey;

  constructor() {
    this.reset();
  }

  reset() {
    // Use slice to create a shallow copy only when needed
    this._records = ITEMS.slice();
    this._processed = 0;
    this._lastEvaluatedKey = undefined;
  }

  set processed(value: number) {
    this._processed = value;
  }

  get processed(): number {
    return this._processed;
  }

  set lastEvaluatedKey(value) {
    this._lastEvaluatedKey = value;
  }

  get lastEvaluatedKey() {
    return this._lastEvaluatedKey;
  }

  get records(): Item[] {
    return this._records;
  }
  set records(value: Item[]) {
    this._records = value;
  }

  public sort(params: any) {
    if (
      typeof params.ScanIndexForward !== 'undefined' &&
      params.ScanIndexForward === false
    ) {
      this.records.sort((a, b) => b.sk.localeCompare(a.sk));
    } else {
      this.records.sort((a, b) => a.sk.localeCompare(b.sk));
    }
    return this;
  }

  public pick(params: any, size: number) {
    if (params.ExclusiveStartKey) {
      const { pk, sk } = params.ExclusiveStartKey;
      const position = this.records.findIndex(e => e.pk === pk && e.sk === sk);
      this._records = this.records.slice(position + 1, position + 1 + size);
      this._processed = position + 1;
      this.lastEvaluatedKey =
        this.processed + this.records.length >= TOTAL_RECORDS
          ? undefined
          : this.records[this.records.length - 1];
    } else {
      this._records = this.records.slice(0, size);
      this._processed = 0;
      this.lastEvaluatedKey = this.records[this.records.length - 1];
    }
    return this;
  }

  public partition(params: any) {
    if (
      params.KeyConditionExpression &&
      params.ExpressionAttributeNames &&
      params.ExpressionAttributeValues
    ) {
      const [key, value] = params.KeyConditionExpression.replace(
        /\s/g,
        '',
      ).split('=');
      this._records = this.records.filter(
        document =>
          document[params.ExpressionAttributeNames[key]] ===
          params.ExpressionAttributeValues[value],
      );
    }
    return this;
  }

  public filter(params: any) {
    if (
      params.FilterExpression &&
      params.ExpressionAttributeNames &&
      params.ExpressionAttributeValues
    ) {
      const [key, value] = params.FilterExpression.replace(/\s/g, '').split(
        '=',
      );
      this._records = this.records.filter(
        document =>
          document[params.ExpressionAttributeNames[key]] ===
          params.ExpressionAttributeValues[value],
      );
    }
    return this;
  }
}

describe('Pagination', () => {
  let mockQuery: jest.SpyInstance;
  const query = queryWithCursor.bind(null, testClient, {
    ...testTableConf,
    cursorSecret: 'secret',
  });
  const mockDB = new DynamoDBPaginateQueryMockImpl();

  beforeEach(() => {
    mockQuery = jest
      .spyOn(testClient, 'send')
      .mockImplementation((command: any) => {
        const params = command.input;
        mockDB.reset(); // Reset state instead of creating new instance
        const items = mockDB
          .partition(params)
          .sort(params)
          .pick(params, params.Limit)
          .filter(params).records;

        return Promise.resolve({
          Items: items as any[],
          LastEvaluatedKey: mockDB.lastEvaluatedKey,
          ScannedCount: TOTAL_RECORDS,
        });
      });
  });

  afterEach(() => {
    mockQuery.mockRestore();
    jest.clearAllMocks();
  });

  test('with default page size (all items) and sort order', async () => {
    const result = await query({
      where: { pk: 'pk#products' },
    });
    expect(testClient.send).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(150);
    expect(result.cursor).toBeUndefined(); // because we querie with default limit and we know there are 150
    const mockValueOfQuery = (testClient.send as jest.Mock).mock.calls[0][0].input;
    expect(mockValueOfQuery.KeyConditionExpression).toBe('#PK = :pk');
    expect(mockValueOfQuery.TableName).toBe(testTableConf.name);
    expect(result.items).toStrictEqual(
      ITEMS.filter(item => item.pk === 'pk#products').sort((a, b) =>
        a.sk.localeCompare(b.sk),
      ),
    );
  });

  test('with custom page size', async () => {
    const result = await query({
      where: {
        pk: 'pk#products',
      },
      limit: 5,
    });
    expect(testClient.send).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.send).toHaveBeenNthCalledWith(1, expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        KeyConditionExpression: '#PK = :pk',
        ExpressionAttributeNames: {
          '#PK': 'pk',
        },
        ExpressionAttributeValues: {
          ':pk': 'pk#products',
        },
        ExclusiveStartKey: undefined,
        Limit: 5,
      }
    }));
  });

  test('with custom page size and custom orderBy ', async () => {
    const result = await query({
      where: {
        pk: 'pk#products',
      },
      limit: 5,
      orderBy: Direction.DESC,
    });
    expect(testClient.send).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.send).toHaveBeenNthCalledWith(1, expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        KeyConditionExpression: '#PK = :pk',
        ExpressionAttributeNames: {
          '#PK': 'pk',
        },
        ExpressionAttributeValues: {
          ':pk': 'pk#products',
        },
        ExclusiveStartKey: undefined,
        Limit: 5,
        ScanIndexForward: false,
      }
    }));
    expect(result.items[0]).toStrictEqual(
      ITEMS.filter(item => item.pk === 'pk#products').sort((a, b) =>
        b.sk.localeCompare(a.sk),
      )[0],
    );
  });

  test('initial request with custom page size', async () => {
    const result = await query({
      where: {
        pk: 'pk#products',
      },
      limit: 5,
    });
    expect(testClient.send).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.send).toHaveBeenNthCalledWith(1, expect.objectContaining({
      input: {
        TableName: testTableConf.name,
        KeyConditionExpression: '#PK = :pk',
        ExpressionAttributeNames: {
          '#PK': 'pk',
        },
        ExpressionAttributeValues: {
          ':pk': 'pk#products',
        },
        ExclusiveStartKey: undefined,
        Limit: 5,
      }
    }));
  });

  test('returns result for sub-sequent query based on prevCursor', async () => {
    const PAGE_SIZE = 5;
    let prevCursor,
      items = [],
      i = 1;

    const actualItems = ITEMS.filter(
      item => item.pk === 'pk#products',
    ).sort((a, b) => a.sk.localeCompare(b.sk));
    do {
      const result = await query({
        where: {
          pk: 'pk#products',
        },
        limit: PAGE_SIZE,
        prevCursor,
      });

      expect(testClient.send).toHaveBeenNthCalledWith(i, expect.objectContaining({
        input: expect.objectContaining({
          TableName: testTableConf.name,
          KeyConditionExpression: '#PK = :pk',
          ExpressionAttributeNames: {
            '#PK': 'pk',
          },
          ExpressionAttributeValues: {
            ':pk': 'pk#products',
          },
          Limit: 5,
        })
      }));

      if (items.length > 0) {
        const { pk, sk } = items[items.length - 1];
        const position = actualItems.findIndex(e => e.pk === pk && e.sk === sk);

        expect(result.items).toStrictEqual(
          actualItems.slice(position + 1, position + 1 + PAGE_SIZE),
        );
      } else {
        expect(result.items).toStrictEqual(actualItems.slice(0, 5));
      }

      items = items.concat(result.items);

      prevCursor = result.cursor;

      expect(result.scannedCount).toBe(actualItems.length);
      i++;
    } while (prevCursor);

    expect(testClient.send).toHaveBeenCalledTimes(
      Math.ceil(TOTAL_RECORDS / PAGE_SIZE),
    );
    expect(items).toHaveLength(150);
    expect(prevCursor).toBeUndefined();
  });

  test('request with filter and custom page size', async () => {
    const result = await query({
      where: {
        pk: `pk#order#${STATUS_DICT[0]}`,
        createdBy: 'Gru',
      },
      limit: 3,
    });

    const orders = ITEMS.filter(
      item => item.pk === `pk#order#${STATUS_DICT[0]}`,
    ).sort((a, b) => a.sk.localeCompare(b.sk));
    expect(result.items).toStrictEqual(
      orders.filter(item => item.createdBy === 'Gru').slice(0, 3),
    );
  });

  test('with different limit for subsequent query if first result does not fulfill the limit', async () => {
    const mockDB1 = new DynamoDBPaginateQueryMockImpl();
    const mockDB2 = new DynamoDBPaginateQueryMockImpl();

    mockQuery = jest
      .spyOn(testClient, 'send')
      .mockImplementationOnce((command: any) => {
        // first call return limit - 2 result
        const params = command.input;
        const items = mockDB1
          .partition(params)
          .sort(params)
          .pick(params, params.Limit - 2)
          .filter(params).records;

        return Promise.resolve({
          Items: items as any[],
          LastEvaluatedKey: mockDB1.lastEvaluatedKey,
          ScannedCount: TOTAL_RECORDS,
        });
      })
      .mockImplementationOnce((command: any) => {
        // second call should return what is left
        const params = command.input;
        const items = mockDB2
          .partition(params)
          .sort(params)
          .pick(params, params.Limit)
          .filter(params).records;

        return Promise.resolve({
          Items: items as any[],
          LastEvaluatedKey: mockDB2.lastEvaluatedKey,
          ScannedCount: TOTAL_RECORDS,
        });
      });

    const result = await query({
      where: {
        pk: 'pk#products',
      },
      limit: 5,
    });
    expect(testClient.send).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    const mockValueOfQuery = (testClient.send as jest.Mock).mock.calls[1][0].input;
    expect(mockValueOfQuery.Limit).toBe(2);
    expect(mockValueOfQuery.ExclusiveStartKey).toBeDefined();
  });

  test('IndexName should be empty when querying using default index', async () => {
    mockQuery = jest.spyOn(testClient, 'send');

    await query({
      where: {
        pk: 'something',
      },
      limit: 5,
    });

    const calledParams = (mockQuery.mock.calls[0][0] as any).input;
    expect(calledParams).not.toHaveProperty('IndexName');
  });

  test('consistent read set to true', async () => {
    mockQuery = jest.spyOn(testClient, 'send').mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });

    await query({
      where: {
        pk: 'xxxx',
      },
    }, undefined, true);

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        TableName: testTableConf.name,
        ConsistentRead: true,
      })
    }));
  });

  test('consistent read set to false', async () => {
    mockQuery = jest.spyOn(testClient, 'send').mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });

    await query({
      where: {
        pk: 'xxxx',
      },
    }, undefined, false);

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        TableName: testTableConf.name,
        ConsistentRead: false,
      })
    }));
  });

  test('consistent read not specified', async () => {
    mockQuery = jest.spyOn(testClient, 'send').mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });

    await query({
      where: {
        pk: 'xxxx',
      },
    }, undefined, undefined);

    expect(testClient.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        TableName: testTableConf.name,
      })
    }));
    // Ensure ConsistentRead is not present in the params
    expect((testClient.send as jest.Mock).mock.calls[0][0].input.ConsistentRead).toBeUndefined();
  });
});

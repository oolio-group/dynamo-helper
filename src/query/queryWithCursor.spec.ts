import {
  ItemList,
  Key,
  QueryInput,
  QueryOutput,
} from 'aws-sdk/clients/dynamodb';
import { testClient, testTableConf } from '../testUtils';
import { Direction, Where } from '../types';
import { queryWithCursor } from './queryWithCursor';
import { decrypt } from '../utils';

describe('queryWithCursor', () => {
  const query = queryWithCursor.bind(null, testClient, testTableConf);
  let mockQuery: jest.SpyInstance;
  beforeEach(() => {
    mockQuery = jest.spyOn(testClient, 'query').mockReturnValue({
      promise: jest
        .fn()
        .mockResolvedValue({ Items: [], LastEvaluatedKey: undefined }),
    });
  });

  afterEach(() => {
    mockQuery.mockReset();
  });

  test('input validation', async () => {
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

    expect(testClient.query).toHaveBeenCalledTimes(0);
  });

  test('input validation', async () => {
    await expect(
      query(
        {
          where: {
            pk: {
              beginsWith: 'product',
            },
          } as Where<{ pk: string }>,
        },
        { secret: 'secret' },
      ),
    ).rejects.toThrowError('Partition key condition can only be a string');
  });

  test('input validation', async () => {
    await expect(
      query({
        where: {
          pk: 'product',
        } as Where<{ pk: string }>,
      }),
    ).rejects.toThrowError(
      'Expected secret which is used to encrypt the `LastEvaluatedKey`',
    );
  });

  test('when there are no items available in table, returns empty', async () => {
    const results = await query(
      {
        where: {
          pk: 'xxxx',
        },
      },
      { secret: 'secret' },
    );

    expect(results.items).toHaveLength(0);
    expect(results.cursor).toBeUndefined();
  });

  test('with index name specified', () => {
    query(
      {
        where: {
          sk: 'xxxx',
        },
      },
      {
        indexName: 'reverse',
        secret: 'secret',
      },
    );

    expect(testClient.query).toHaveBeenCalledWith({
      TableName: testTableConf.name,
      IndexName: 'reverse',
      KeyConditionExpression: '#SK = :sk',
      ExpressionAttributeNames: {
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':sk': 'xxxx',
      },
      ExclusiveStartKey: undefined,
    });
  });
});

interface Item {
  pk: string;
  sk: string;
}
const TOTAL_RECORDS = 50;

const ITEMS = new Array(TOTAL_RECORDS).fill(0).map((item, i) => {
  const date = new Date(2021, Math.floor(Math.random() * 6) + 1, i);
  return {
    pk: `pk#${item}`,
    sk: `sk#${date.getFullYear()}#${date.getMonth()}#${date.getDate()}`,
  };
});
class DbQuery {
  private _records = ITEMS;

  get records(): Item[] {
    return this._records;
  }
  set records(value: Item[]) {
    this._records = value;
  }

  public sortItems(params: QueryInput) {
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

  public filterItems(params: QueryInput, size: number) {
    if (params.ExclusiveStartKey) {
      const { pk, sk } = params.ExclusiveStartKey;
      const position = this.records.findIndex(e => e.pk === pk && e.sk === sk);
      return {
        processed: position + 1,
        items: this.records.slice(position + 1, position + 1 + size),
      };
    }
    return { processed: 0, items: this.records.slice(0, size) };
  }
}

describe('Pagination', () => {
  let mockQuery: jest.SpyInstance;
  const query = queryWithCursor.bind(null, testClient, testTableConf);

  beforeEach(() => {
    mockQuery = jest
      .spyOn(testClient, 'query')
      .mockImplementation((params: QueryInput) => {
        const { items, processed } = new DbQuery()
          .sortItems(params)
          .filterItems(params, params.Limit);

        let lastEvaluatedKey;
        if (params.Limit) {
          lastEvaluatedKey =
            processed + items.length >= TOTAL_RECORDS
              ? undefined
              : items[items.length - 1];
        }

        return {
          promise: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              Items: (items as unknown) as ItemList,
              LastEvaluatedKey: lastEvaluatedKey,
            } as QueryOutput);
          }),
        };
      });
  });

  afterEach(() => {
    mockQuery.mockReset();
  });

  test('with default page size (all items) and sort order', async () => {
    const result = await query(
      {
        where: { pk: 'xxxx' },
      },
      {
        secret: 'secret',
      },
    );
    expect(testClient.query).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(50);
    expect(result.cursor).toBeUndefined();
    expect(testClient.query).toHaveBeenNthCalledWith(1, {
      TableName: testTableConf.name,
      IndexName: 'default',
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
      ExclusiveStartKey: undefined,
    });
    expect(result.items[0]).toStrictEqual(
      ITEMS.sort((a, b) => a.sk.localeCompare(b.sk))[0],
    );
  });

  test('with customm page size', async () => {
    const result = await query(
      {
        where: {
          pk: 'xxxx',
        },
        limit: 5,
      },
      {
        secret: 'secret',
      },
    );
    expect(testClient.query).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.query).toHaveBeenNthCalledWith(1, {
      TableName: testTableConf.name,
      IndexName: 'default',
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
      ExclusiveStartKey: undefined,
      Limit: 5,
    });
  });

  test('with customm page size and custom orderBy ', async () => {
    const result = await query(
      {
        where: {
          pk: 'xxxx',
        },
        limit: 5,
        orderBy: Direction.DESC,
      },
      {
        secret: 'secret',
      },
    );
    expect(testClient.query).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.query).toHaveBeenNthCalledWith(1, {
      TableName: testTableConf.name,
      IndexName: 'default',
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
      ExclusiveStartKey: undefined,
      Limit: 5,
      ScanIndexForward: false,
    });
    expect(result.items[0]).toStrictEqual(
      ITEMS.sort((a, b) => b.sk.localeCompare(a.sk))[0],
    );
  });

  test('initial request with custom page size', async () => {
    const result = await query(
      {
        where: {
          pk: 'xxxx',
        },
        limit: 5,
      },
      {
        secret: 'secret',
      },
    );
    expect(testClient.query).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(5);
    expect(typeof result.cursor).toBe('string');
    expect(testClient.query).toHaveBeenNthCalledWith(1, {
      TableName: testTableConf.name,
      IndexName: 'default',
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
      ExclusiveStartKey: undefined,
      Limit: 5,
    });
  });

  test('returns result for sub-sequent query based on prevCursor', async () => {
    const PAGE_SIZE = 5;
    let prevCursor,
      items = [],
      i = 1;

    const actualItems = ITEMS.sort((a, b) => a.sk.localeCompare(b.sk));
    do {
      const result = await query(
        {
          where: {
            pk: 'xxxx',
          },
          limit: PAGE_SIZE,
        },
        {
          secret: 'secret',
          prevCursor,
        },
      );

      expect(testClient.query).toHaveBeenNthCalledWith(i, {
        TableName: testTableConf.name,
        IndexName: 'default',
        KeyConditionExpression: '#PK = :pk',
        ExpressionAttributeNames: {
          '#PK': 'pk',
        },
        ExpressionAttributeValues: {
          ':pk': 'xxxx',
        },
        ExclusiveStartKey: decrypt<Key>(prevCursor, 'secret'),
        Limit: 5,
      });

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
      i++;
    } while (prevCursor);

    expect(testClient.query).toHaveBeenCalledTimes(
      Math.ceil(TOTAL_RECORDS / PAGE_SIZE),
    );
    expect(items).toHaveLength(50);
    expect(prevCursor).toBeUndefined();
  });
});

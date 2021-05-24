import { Direction } from '../types';
import { buildQueryTableParams } from './queryBuilder';

type ProductModel = {
  pk: string;
  sk: string;
  id: string;
  isActive: boolean;
  barcode?: string;
};

const sampleCases = [
  {
    name: 'sk operations: between',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          between: ['1', '2'],
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk_start AND :sk_end',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk_end': '2',
        ':sk_start': '1',
      },
    },
  },
  {
    name: 'sk operations: between v2',
    filter: {
      where: {
        pk: 'xxxx',
        sk: ['1', '2'],
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK BETWEEN :sk_start AND :sk_end',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk_end': '2',
        ':sk_start': '1',
      },
    },
  },
  {
    name: 'sk operations: >',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          gt: 'xxxx',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK > :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'xxxx',
      },
    },
  },
  {
    name: 'sk operations: >=',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          gte: 'xxxx',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK >= :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'xxxx',
      },
    },
  },
  {
    name: 'sk operations: <',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          lt: 'xxxx',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK < :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'xxxx',
      },
    },
  },
  {
    name: 'sk operations: <=',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          lte: 'xxxx',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK <= :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'xxxx',
      },
    },
  },
  {
    name: 'sk operations: =',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          '=': 'yyyy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK = :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'yyyy',
      },
    },
  },
  {
    name: 'sk operations: eq',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          eq: 'yyyy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND #SK = :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'yyyy',
      },
    },
  },
  {
    name: 'sk operations: begins_with',
    filter: {
      where: {
        pk: 'xxxx',
        sk: {
          beginsWith: 'yy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk AND begins_with(#SK, :sk)',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'yy',
      },
    },
  },
  {
    name: 'filter conditions: contains',
    filter: {
      where: {
        pk: 'xxxx',
        name: {
          like: 'yy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: 'contains(#NAME, :name)',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#NAME': 'name',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':name': 'yy',
      },
    },
  },
  {
    name: 'filter conditions: includes',
    filter: {
      where: {
        pk: 'xxxx',
        id: {
          inq: ['yyyy', 'zzzz'],
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID IN :id',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id': '(yyyy,zzzz)',
      },
    },
  },
  {
    name: 'filter conditions: includes v2',
    filter: {
      where: {
        pk: 'xxxx',
        id: ['yyyy', 'zzzz'],
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID IN :id',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id': '(yyyy,zzzz)',
      },
    },
  },
  {
    name: 'filter conditions: between',
    filter: {
      where: {
        pk: 'xxxx',
        id: {
          between: ['yyyy', 'zzzz'],
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID BETWEEN :id_start AND :id_end',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id_start': 'yyyy',
        ':id_end': 'zzzz',
      },
    },
  },
  {
    name: 'filter conditions: eq',
    filter: {
      where: {
        pk: 'xxxx',
        id: {
          eq: 'yyyy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID = :id',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id': 'yyyy',
      },
    },
  },
  {
    name: 'filter conditions: eq v2',
    filter: {
      where: {
        pk: 'xxxx',
        id: 'yyyy',
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID = :id',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id': 'yyyy',
      },
    },
  },
  {
    name: 'filter conditions: neq',
    filter: {
      where: {
        pk: 'xxxx',
        id: {
          neq: 'yyyy',
        },
      },
    },
    expected: {
      KeyConditionExpression: '#PK = :pk',
      FilterExpression: '#ID <> :id',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#ID': 'id',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':id': 'yyyy',
      },
    },
  },
];

describe('Query Builder', () => {
  test('exports build query', () => {
    expect(typeof buildQueryTableParams).toBe('function');
  });

  test('validates input', () => {
    expect(() => buildQueryTableParams(undefined)).toThrowError(
      'Expected one argument of type Filter<T> received undefined',
    );
    expect(() => buildQueryTableParams(undefined)).toThrowError(
      'Expected one argument of type Filter<T> received undefined',
    );
    expect(() => buildQueryTableParams(undefined)).toThrowError(
      'Expected one argument of type Filter<T> received undefined',
    );
    expect(() => buildQueryTableParams(undefined)).toThrowError(
      'Expected one argument of type Filter<T> received undefined',
    );
    expect(() => buildQueryTableParams(null)).toThrowError(
      'Expected one argument of type Filter<T> received object',
    );
    expect(() => buildQueryTableParams('' as unknown)).toThrowError(
      'Expected one argument of type Filter<T> received string',
    );
    expect(() => buildQueryTableParams({}, null, null)).toThrowError(
      'Expected three arguments of type Filter<T>, string, string received object, object, object',
    );
    expect(() => buildQueryTableParams({}, null)).toThrowError(
      'Expected two arguments of type Filter<T>, string, received object, object',
    );
    expect(() => buildQueryTableParams({}, 's', null)).toThrowError(
      'Expected three arguments of type Filter<T>, string, string received object, string, object',
    );
    expect(() => buildQueryTableParams({}, '', '')).toThrowError(
      'Expected $partitionKeyName(string), $sortKeyName(string) to not be empty',
    );
  });

  test('validates filter', () => {
    // At least partition key condition is required
    expect(() => buildQueryTableParams<ProductModel>({})).toThrowError(
      'Partition key condition is required for query operation',
    );

    expect(() =>
      buildQueryTableParams<ProductModel>({
        where: {},
      }),
    ).toThrowError('Partition key condition is required for query operation');

    expect(() =>
      buildQueryTableParams<ProductModel>({
        where: {
          sk: 'yyyy',
        },
      }),
    ).toThrowError('Partition key condition is required for query operation');

    expect(() =>
      buildQueryTableParams<ProductModel>({
        where: {
          pk: {
            lt: '2',
          },
        },
      }),
    ).toThrowError('Partition key condition can only be a string');

    expect(() =>
      buildQueryTableParams<ProductModel>(
        {
          where: {
            sk: 'yyyy',
          },
        },
        'sk',
      ),
    ).not.toThrowError();

    expect(() =>
      buildQueryTableParams<ProductModel>({
        where: {
          pk: '2',
        },
        limit: null,
      }),
    ).toThrowError('Limit should be a number greater than 0');

    expect(() =>
      buildQueryTableParams<ProductModel>({
        where: {
          pk: '2',
        },
        limit: 0,
      }),
    ).toThrowError('Limit should be a number greater than 0');
  });

  test('key condition', () => {
    // default partition key is pk and sortKey is sk
    let tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    });

    expect(tableParams).toStrictEqual({
      KeyConditionExpression: '#PK = :pk AND #SK = :sk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
        '#SK': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
        ':sk': 'yyyy',
      },
    });

    // sk is optional
    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
      },
    });

    expect(tableParams).toStrictEqual({
      KeyConditionExpression: '#PK = :pk',
      ExpressionAttributeNames: {
        '#PK': 'pk',
      },
      ExpressionAttributeValues: {
        ':pk': 'xxxx',
      },
    });
  });

  test('uses given primary key names', () => {
    const tableParams = buildQueryTableParams(
      {
        where: {
          hashKey: 'yyyy',
          rangeKey: 'xxxx',
        },
      },
      'hashKey',
      'rangeKey',
    );

    expect(tableParams).toStrictEqual({
      KeyConditionExpression: '#HASHKEY = :hashKey AND #RANGEKEY = :rangeKey',
      ExpressionAttributeNames: {
        '#HASHKEY': 'hashKey',
        '#RANGEKEY': 'rangeKey',
      },
      ExpressionAttributeValues: {
        ':hashKey': 'yyyy',
        ':rangeKey': 'xxxx',
      },
    });
  });

  test('applies projection expression when fields are specified', () => {
    let tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    });

    expect(tableParams).not.toHaveProperty('ProjectionExpression');

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      fields: [],
    });

    expect(tableParams).not.toHaveProperty('ProjectionExpression');

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      fields: ['id'],
    });

    expect(tableParams.ProjectionExpression).toBe('id,pk,sk');

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      fields: ['id', 'isActive', 'barcode'],
    });

    expect(tableParams.ProjectionExpression).toBe('id,isActive,barcode,pk,sk');
  });

  test('applies limit on items', () => {
    let tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    });

    expect(tableParams).not.toHaveProperty('Limit');

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      limit: 5,
    });
    expect(tableParams.Limit).toBe(5);
  });

  test('sort order', () => {
    let tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
    });

    expect(tableParams).not.toHaveProperty('ScanIndexForward');

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      orderBy: Direction.DESC,
    });
    expect(tableParams.ScanIndexForward).toBe(false);

    tableParams = buildQueryTableParams<ProductModel>({
      where: {
        pk: 'xxxx',
        sk: 'yyyy',
      },
      orderBy: Direction.ASC,
    });
    expect(tableParams.ScanIndexForward).toBe(true);
  });

  sampleCases.forEach(x => {
    test(x.name, () => {
      const result = buildQueryTableParams(x.filter);
      expect(result).toStrictEqual(x.expected);
    });
  });
});

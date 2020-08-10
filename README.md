# @hitz-group/dynamo-helper

Library package that exports several methods for helping with DynamoDB operations. Abstracts most DynamoDB operations and builds query parameters using a unified filter object.

[![codecov](https://codecov.io/gh/hitz-group/dynamo-helper/branch/master/graph/badge.svg?token=WDLQ7IBV6Y)](https://codecov.io/gh/hitz-group/dynamo-helper) [![npm](https://img.shields.io/npm/v/@hitz-group/dynamo-helper/latest.svg)](https://www.npmjs.com/package/@hitz-group/dynamo-helper) ![Build](https://github.com/hitz-group/dynamo-helper/workflows/Unit%20Tests%20and%20ESLint/badge.svg)

## Usage

### Create DynamoHelper instance

Import DynamoHelper

```typescript
import { DynamoHelper } from '@hitz-group/dynamo-helper';

const { DynamoHelper } = require('@hitz-group/dynamo-helper');
```

Use constructor to create the DynamoHelper instance

```typescript
// region and endpoint are optional
const dynamoHelper = new DynamoHelper(tableConf, region, endpoint);
```

tableConf should be of type TableConfig

```typescript
type TableIndex = { partitionKeyName: string; sortKeyName: string };

export interface TableConfig {
  name: string;
  indexes: { default: TableIndex } & Record<string, TableIndex>;
}
```

### Example

```typescript
import { DynamoHelper } from '@hitz-group/dynamo-helper';

const table = {
  name: 'my-ddb-table',
  indexes: {
    default: {
      partitionKeyName: 'pk',
      sortKeyName: 'sk',
    },
  },
};
const client = new DynamoHelper(table, 'ap-south-1');

await client.getItem({ id: 'book-123' });
await client.getItem({ pk: 'library#books', sk: 'book-123' });

await client.query({
  where: {
    pk: 'library#books',
    publishedAt: {
      between: [15550000, 15800000],
    },
  },
});
```

### buildQueryTableParams

```typescript
import { buildQueryTableParams } from '@hitz-group/dynamo-helper';

const { buildQueryTableParams } = require('@hitz-group/dynamo-helper');
```

This method generates DynamoDB query input params from given filter object of type `Filter<T>`

```typescript
buildQueryTableParams<T extends object = AnyObject>(
  filter: Filter<T>,
  partitionKey = 'pk',
  sortKey = 'sk',
): QueryInput
```

It thoroughly validates input based on following criteria

- Filter must strictly be of type `Filter<T>`
- PartitionKey and sortKey if given needs to be string
- PartitionKey cannot be empty and is required for query operation
- Where is required and needs to contain at least partition key condition
- Partition key condition can only be equal operation
- Fields if provided needs to contain string (fields of model)
- Limit if provided needs to be a number greater than zero

#### Filter

```typescript
export interface Filter<MT extends object = AnyObject> {
  /**
   * The matching criteria
   */
  where?: Where<MT>;
  /**
   * To include/exclude fields
   */
  fields?: Fields<MT>;
  /**
   * Maximum number of entities
   */
  limit?: number;
}
```

#### keys

You can provide the name of your partition key and sort key, they are defaulted to `pk` and `sk`

#### Return value

It returns a partial `QueryInput` which does not contain `TableName` or `IndexName`

#### Usage

```typescript
import { buildQueryTableParams } from '@hitz-group/dynamo-helper';

// Get all inactive product id's in organization
const queryInput = buildQueryTableParams<ProductModel>({
  where: {
    pk: 'org_uuid',
    sk: {
      beginsWith: 'product_',
    },
    isActive: false,
  },
  fields: ['id'],
  limit: 5,
});
```

### query

Perform a query operation in DynamoDB. Input parameter `Filter` can be customized with various operations

See type `Filter` for supported operations

```typescript
import { query } from '@hitz-group/dynamo-helper';

// Get all inactive product id's in organization
const products = await dynamoHelper.query<ProductModel>({
  where: {
    pk: 'org_uuid',
    sk: {
      beginsWith: 'product_',
    },
    isActive: false,
    fields: ['id'],
  },
});
```

#### Supported filter operators

- `eq`
- `neq` (filter conditions only)
- `gt`
- `gte`
- `lt`
- `lte`
- `inq`
- `between`
- `like`
- `beginsWith`

### getItem

Fetch an item using pk and sk combination. Returns item if found or returns null
`getItem<T>(key: DocumentClient.Key, fields: Array<keyof T>)`

#### key

Required, at least partition key values must be provided.

#### fields

Optional, specify fields to project

```typescript
import { getItem } from '@hitz-group/dynamo-helper';

// Get a single product matching the key
await dynamoHelper.getItem<ProductModel>({ pk: 'org_uuid', sk: 'product_xxx' });
await dynamoHelper.getItem<ProductModel>({ id: 'product_xxx' }, [
  'id',
  'isActive',
]);
```

### batchGetItems

Fetch many items using pk and sk combination

```typescript
import { batchGetItems } from '@hitz-group/dynamo-helper';

// Get all products matching the keys
const products = await dynamoHelper.batchGetItems<ProductModel>([
  { pk: 'x', sk: '1' },
  { pk: 'y', sk: '2' },
]);
```

### exists

Check if an item exists in the database with the keys provided. Returns a boolean value

```typescript
import { exists } from '@hitz-group/dynamo-helper';

// Check if product already exists
if (await dynamoHelper.exists({ id: 'x' })) {
  console.log('exists');
}
```

### putItem

Create a new item or replace an existing item in the database

```typescript
import { putItem } from '@hitz-group/dynamo-helper';

await dynamoHelper.putItem({
  pk: 'x',
  sk: '1',
  name: 'Product A',
});
```

### deleteItem

Remove an item from database matching the key provided if it exists

```typescript
import { deleteItem } from '@hitz-group/dynamo-helper';

// delete product
await dynamoHelper.deleteItem({ id: '1' });
```

### transactPutItems

Create or replace multiple items in the database as a transaction
If any of the many operations fails then whole transaction is considered as failed.
This is useful when multiple entries needs to be created or replaced for an API operation

```typescript
import { transactPutItems } from '@hitz-group/dynamo-helper';

// initiate a transaction
await dynamoHelper.transactPutItems([
  {
    pk: 'product_1',
    sk: 'product_1',
    name: 'Product A',
  },
  {
    pk: 'product_2',
    sk: 'product_2',
    name: 'Product B',
  },
  {
    pk: 'org_1',
    sk: 'product_1',
    isActive: true,
  },
]);
```

### batchPutItems

Create or replace multiple items in the database at the same time. This method will chunk your data into batches of 25 items.

> The BatchWriteItem operation puts or deletes multiple items in one or more tables. A single call to BatchWriteItem can write up to 16 MB of data, which can comprise as many as 25 put or delete requests. Individual items to be written can be as large as 400 KB.

```typescript
import { batchPutItems } from '@hitz-group/dynamo-helper';

// create multiple items
await dynamoHelper.batchPutItems([
  {
    pk: 'product_1',
    sk: 'product_1',
    name: 'Product A',
  },
  {
    pk: 'product_2',
    sk: 'product_2',
    name: 'Product B',
  },
  {
    pk: 'org_1',
    sk: 'product_1',
    isActive: true,
  },
]);
```

### batchDeleteItems

Delete multiple items in the database at the same time. This method will chunk your data into batches of 25 items.

> The BatchWriteItem operation puts or deletes multiple items in one or more tables. A single call to BatchWriteItem can write up to 16 MB of data, which can comprise as many as 25 put or delete requests. Individual items to be written can be as large as 400 KB.

```typescript
import { batchDeleteItems } from '@hitz-group/dynamo-helper';

// delete multiple items
await dynamoHelper.batchDeleteItems([
  {
    pk: 'product_1',
    sk: 'product_1',
  },
  {
    pk: 'product_2',
    sk: 'product_2',
  },
  {
    pk: 'org_1',
    sk: 'product_1',
  },
]);
```

### batchExists

Checks if keys provided exists in database or not. Returns empty list if all items are found in DB. Returns list of items not found in DB if there are non existent items.

```typescript
import { batchExists } from '@hitz-group/dynamo-helper';

const result = await dynamoHelper.batchExists([
  {
    pk: 'product_1',
    sk: 'product_1',
  },
  {
    pk: 'product_2',
    sk: 'product_2',
  },
  {
    pk: 'org_1',
    sk: 'product_1',
  },
]);

if (result.length === 0) {
  // All items exists
} else {
  // Items that does not exist
  console.log(result);
}
```

## TODO

- [ ] Scan operation support
- [ ] Support tables without sort key

## Development

### Build

Build all projects `yarn build`
Clean build output `yarn clean`

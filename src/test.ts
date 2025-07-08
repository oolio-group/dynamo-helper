import { DynamoHelper } from './DynamoHelper';
import { ConditionExpressionKind, FilterOperators } from './types';

const table = {
  name: 'till-x-test-in',
  indexes: {
    default: {
      partitionKeyName: 'pk',
      sortKeyName: 'sk',
    },
    gsi1: {
      partitionKeyName: 'gs1pk',
      sortKeyName: 'gs1sk',
    },
    gsi2: {
      partitionKeyName: 'gs2pk',
      sortKeyName: 'gs2sk',
    },
    gsi3: {
      partitionKeyName: 'gs3pk',
      sortKeyName: 'gs3sk',
    },
    gsi4: {
      partitionKeyName: 'gs4pk',
      sortKeyName: 'gs4sk',
    },
    gsi5: {
      partitionKeyName: 'gs5pk',
      sortKeyName: 'gs5sk',
    },
    gsi6: {
      partitionKeyName: 'gs6pk',
      sortKeyName: 'gs6sk',
    },
  },
};
const client = new DynamoHelper(table, 'ap-southeast-1');

client
  .query({
    where: {
      pk: 'store#37059ae2-dfb9-40c8-953a-f68aa872c86a#settings',
      appVersion: { exists: false },
    },
  })
  .then(x => console.log(x, '\n len: ' + x.length));

client
  .query(
    {
      where: {
        gs1pk: 'deviceprofile#d0c622d0-4343-4583-9c02-54b1865cf609',
        appVersion: { exists: true },
      },
    },
    'gsi1',
  )
  .then(x => console.log(x, '\n len: ' + x.length));

async function testConditionalUpdateItem() {
  const storeId = '61da543d-1252-45b9-bc98-389c40d96761';
  const updatedOrder = {
    pk: `STORE#${storeId}`,
    sk: 'open-shift',
    status: 'open',
    updatedAt: new Date().toISOString(),
  };
  await client.updateItem(
    { pk: updatedOrder.pk, sk: updatedOrder.sk }, // Key object with both partition and sort key
    updatedOrder,
    [
      {
        kind: ConditionExpressionKind.Comparison,
        key: 'pk',
        comparator: ('attribute_not_exists' as unknown) as FilterOperators,
        value: updatedOrder.pk,
      },
    ],
  );
}
testConditionalUpdateItem();

import { TableConfig } from './types';

export const testTableConf: TableConfig = {
  name: 'sample-table',
  indexes: {
    default: {
      partitionKeyName: 'pk',
      sortKeyName: 'sk',
    },
    reverse: {
      partitionKeyName: 'sk',
      sortKeyName: 'pk',
    },
  },
};
export const testClient = {
  send: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

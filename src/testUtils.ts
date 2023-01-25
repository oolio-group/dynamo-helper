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
  query: jest.fn().mockReturnThis(),
  scan: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  write: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  batchGet: jest.fn().mockReturnThis(),
  batchWrite: jest.fn().mockReturnThis(),
  transactWrite: jest.fn().mockReturnThis(),
  promise: jest.fn(),
  update: jest.fn().mockReturnThis(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

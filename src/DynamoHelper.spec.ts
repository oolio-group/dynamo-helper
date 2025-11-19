import { DynamoHelper } from './DynamoHelper';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

describe('DynamoHelper', () => {
  const tableConfig = {
    name: 'test-table',
    indexes: {
      default: {
        partitionKeyName: 'pk',
        sortKeyName: 'sk',
      },
    },
  };

  it('should create DynamoDBDocumentClient with removeUndefinedValues option', () => {
    const helper = new DynamoHelper(tableConfig, 'us-east-1');

    // Verify that the dbClient is an instance of DynamoDBDocumentClient
    expect(helper.dbClient).toBeDefined();
    expect(helper.dbClient).toBeInstanceOf(DynamoDBDocumentClient);
  });

  it('should handle updates with undefined values correctly', async () => {
    const helper = new DynamoHelper(tableConfig, 'us-east-1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = jest.spyOn(helper.dbClient, 'send').mockResolvedValue({} as any);

    const key = { pk: 'test_pk', sk: 'test_sk' };
    const item = {
      name: 'Test',
      age: 30,
      undefinedField: undefined,
      description: 'A test item',
    };

    await helper.updateItem(key, item, []);

    // Verify that the send method was called
    expect(spy).toHaveBeenCalled();

    // Verify that the UpdateExpression does not include the undefinedField
    const command = spy.mock.calls[0][0] as UpdateCommand;
    expect(command.input.UpdateExpression).toBeDefined();
    expect(command.input.UpdateExpression).not.toContain('undefinedField');
    expect(command.input.UpdateExpression).toContain('name');
    expect(command.input.UpdateExpression).toContain('age');
    expect(command.input.UpdateExpression).toContain('description');

    spy.mockRestore();
  });
});

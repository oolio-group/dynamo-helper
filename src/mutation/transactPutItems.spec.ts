import DynamoHelper from "../index";
import { TransactWriteItemsInput } from "aws-sdk/clients/dynamodb";

describe("transactPutItems", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.transactWrite = jest.fn().mockReturnValue({
      promise: jest.fn().mockImplementation(async () => {
        return Promise.resolve({});
      }),
    });
  });

  test("exports function", () => {
    expect(typeof dynamoHelper.transactPutItems).toBe("function");
  });

  test("promise rejection", async () => {
    dynamoHelper.dbClient.transactWrite = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });

    await expect(
      dynamoHelper.transactPutItems([{ pk: "xxxx", sk: "yyyy", id: "xxxx" }])
    ).rejects.toStrictEqual([]);
  });

  test("uses transactWrite", async () => {
    await dynamoHelper.transactPutItems([
      { pk: "1", sk: "a", id: "1" },
      { pk: "2", sk: "b", id: "2" },
    ]);
    expect(dynamoHelper.dbClient.transactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            Item: { pk: "1", sk: "a", id: "1" },
            TableName: tableName,
          },
        },
        {
          Put: {
            Item: { pk: "2", sk: "b", id: "2" },
            TableName: tableName,
          },
        },
      ],
    } as TransactWriteItemsInput);
  });
});

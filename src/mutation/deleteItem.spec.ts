import DynamoHelper from "../index";
import { DeleteItemInput } from "aws-sdk/clients/dynamodb";

describe("deleteItem", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.delete = jest.fn().mockReturnValue({
      promise: jest.fn().mockImplementation(async () => {
        return Promise.resolve({});
      }),
    });
  });

  test("exports function", () => {
    expect(typeof dynamoHelper.deleteItem).toBe("function");
  });

  test("promise rejection", async () => {
    dynamoHelper.dbClient.delete = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });

    await expect(dynamoHelper.deleteItem("xxxx", "yyyy")).rejects.toStrictEqual(
      []
    );
  });

  test("uses delete correctly", async () => {
    await dynamoHelper.deleteItem("xxxx", "yyyy");
    expect(dynamoHelper.dbClient.delete).toHaveBeenCalledWith({
      TableName: tableName,
      Key: {
        pk: "xxxx",
        sk: "yyyy",
      },
    } as DeleteItemInput);
  });
});

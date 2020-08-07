import { PutItemInput } from "aws-sdk/clients/dynamodb";
import DynamoHelper from "../index";

describe("putItem", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.put = jest.fn().mockReturnValue({
      promise: jest.fn().mockImplementation(async () => {
        return Promise.resolve({});
      }),
    });
  });

  test("exports function", () => {
    expect(typeof dynamoHelper.putItem).toBe("function");
  });

  test("validates input", () => {
    expect(dynamoHelper.putItem(undefined)).rejects.toThrowError(
      "Expected on argument of type object received undefined"
    );
    expect(dynamoHelper.putItem("" as never)).rejects.toThrowError(
      "Expected on argument of type object received string"
    );
    expect(dynamoHelper.putItem(2 as never)).rejects.toThrowError(
      "Expected on argument of type object received number"
    );
    expect(dynamoHelper.putItem(null)).rejects.toThrowError(
      "Expected on argument of type object received null"
    );
    expect(dynamoHelper.putItem(NaN as never)).rejects.toThrowError(
      "Expected on argument of type object received number"
    );
  });

  test("uses put to write item to db", async () => {
    await dynamoHelper.putItem({ pk: "xxxx", sk: "yyyy", id: "xxxx" });
    expect(dynamoHelper.dbClient.put).toHaveBeenCalledWith({
      Item: { pk: "xxxx", sk: "yyyy", id: "xxxx" },
      TableName: tableName,
    } as PutItemInput);
  });

  test("promise rejection", async () => {
    dynamoHelper.dbClient.put = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });
    await expect(
      dynamoHelper.putItem({ pk: "xxxx", sk: "yyyy", id: "xxxx" })
    ).rejects.toStrictEqual({});
  });
});

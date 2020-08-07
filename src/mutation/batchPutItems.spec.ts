import { fill } from "lodash";
import DynamoHelper from "../index";
import { BatchWriteItemInput } from "aws-sdk/clients/dynamodb";

describe("batchPutItems", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.batchWrite = jest.fn().mockReturnValue({
      promise: jest.fn().mockImplementation(async () => {
        return Promise.resolve({});
      }),
    });
  });

  test("exports function", () => {
    expect(typeof dynamoHelper.batchPutItems).toBe("function");
  });

  test("promise rejection", async () => {
    dynamoHelper.dbClient.batchWrite = jest.fn().mockReturnValue({
      promise: jest.fn().mockRejectedValue([]),
    });
    await expect(dynamoHelper.batchPutItems([{}, {}])).rejects.toStrictEqual(
      []
    );
  });

  test("chunks items to bits of 25 items", async () => {
    await dynamoHelper.batchPutItems([{}, {}]);
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(1);

    await dynamoHelper.batchPutItems(fill(Array(50), {}));
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(3);

    await dynamoHelper.batchPutItems(fill(Array(201), {}));
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(12);
  });

  test("uses batchWrite correctly", async () => {
    await dynamoHelper.batchPutItems([
      { pk: "x", sk: "1" },
      { pk: "y", sk: "2" },
    ]);

    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledWith({
      RequestItems: {
        [tableName]: [
          {
            PutRequest: {
              Item: { pk: "x", sk: "1" },
            },
          },
          {
            PutRequest: {
              Item: { pk: "y", sk: "2" },
            },
          },
        ],
      },
    } as BatchWriteItemInput);
  });
});

import DynamoHelper from "..";
import { BatchGetItemInput, DocumentClient } from "aws-sdk/clients/dynamodb";
import { batchGetItems } from "./batchGetItems";
import { fill } from "lodash";

describe("batchGetItems", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: [],
            },
          }),
        };
      });
  });

  test("exports exists function", () => {
    expect(typeof dynamoHelper.batchGetItems).toBe("function");
  });

  test("returns list of matching items", async () => {
    await expect(dynamoHelper.batchGetItems([])).resolves.toHaveLength(0);
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: [{ id: "xxxx" }],
            },
          }),
        };
      });
    await expect(
      dynamoHelper.batchGetItems([{ pk: "xxxx", sk: "yyyy" }])
    ).resolves.toHaveLength(1);
  });

  test("returns empty if no result found", async () => {
    await expect(dynamoHelper.batchGetItems([])).resolves.toHaveLength(0);

    await expect(
      dynamoHelper.batchGetItems([{ pk: "xxxx", sk: "yyyy" }])
    ).resolves.toHaveLength(0);
  });

  test("chunks requests into 100s", async () => {
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: params.RequestItems[tableName].Keys,
            },
          }),
        };
      });

    await expect(dynamoHelper.batchGetItems([{}, {}]));
    expect(dynamoHelper.dbClient.batchGet).toHaveBeenCalledTimes(1);
    await expect(dynamoHelper.batchGetItems(fill(Array(100), {})));
    expect(dynamoHelper.dbClient.batchGet).toHaveBeenCalledTimes(2);
    const results = await dynamoHelper.batchGetItems(fill(Array(301), {}));
    expect(dynamoHelper.dbClient.batchGet).toHaveBeenCalledTimes(6);
    expect(results).toHaveLength(301);
  });

  test("returns all matches if pagination is not enabled", async () => {
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        const isFirstRequest =
          params.RequestItems[tableName].Keys[0].pk === "xxxx";
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: [isFirstRequest ? { id: "xxxx" } : { id: "yyyy" }],
            },
            UnprocessedKeys: {
              [tableName]: {
                Keys: isFirstRequest ? [{ pk: "aaaa", sk: "bbbb" }] : [],
              },
            },
          }),
        };
      });

    await dynamoHelper.batchGetItems([
      { pk: "xxxx", sk: "yyyy" },
      { pk: "aaaa", sk: "bbbb" },
    ]);
    expect(dynamoHelper.dbClient.batchGet).toHaveBeenCalledTimes(2);
  });

  test("fields to project", async () => {
    const dbClient = dynamoHelper.dbClient;
    await dynamoHelper.batchGetItems([{ pk: "xxxx", sk: "yyyy" }], ["id"]);
    expect(dbClient.batchGet).toHaveBeenCalledWith({
      RequestItems: {
        [tableName]: {
          Keys: [{ pk: "xxxx", sk: "yyyy" }],
          ProjectionExpression: "id",
        },
      },
    });
  });
});

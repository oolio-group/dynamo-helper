import { BatchGetItemInput, DocumentClient } from "aws-sdk/clients/dynamodb";
import range from "lodash/range";
import DynamoHelper from "../index";

describe("batchExists", () => {
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
              [tableName]: params.RequestItems[tableName].Keys,
            },
          }),
        };
      });
  });
  test("returns empty if all keys exist", async () => {
    await expect(
      dynamoHelper.batchExists([
        { pk: "1", sk: "2" },
        { pk: "3", sk: "4" },
      ])
    ).resolves.toHaveLength(0);
  });

  test("returns not found keys if not all items exist", async () => {
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        const keys = params.RequestItems[tableName].Keys;
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: keys.slice(0, 1),
            },
          }),
        };
      });

    await expect(
      dynamoHelper.batchExists([
        { pk: "1", sk: "2" },
        { pk: "3", sk: "4" },
      ])
    ).resolves.toEqual([{ pk: "3", sk: "4" }]);
  });

  test("with 100 items", async () => {
    dynamoHelper.dbClient.batchGet = jest
      .fn()
      .mockImplementation((params: BatchGetItemInput) => {
        const keys = params.RequestItems[tableName].Keys;
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [tableName]: keys.slice(0, Math.floor(keys.length / 2)),
            },
          }),
        };
      });

    const keys = range(100).map((i: string) => ({
      pk: i + "pk",
      sk: i + "sk",
    }));

    await expect(dynamoHelper.batchExists(keys)).resolves.toEqual(
      keys.slice(50)
    );
  });
});

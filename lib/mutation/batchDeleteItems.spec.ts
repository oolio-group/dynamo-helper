import { BatchWriteItemInput, DocumentClient } from "aws-sdk/clients/dynamodb";
import { fill } from "lodash";
import DynamoHelper, * as client from "..";
import { batchDeleteItems } from "./batchDeleteItems";
import { batchPutItems } from "./batchPutItems";

describe("batchDeleteItems", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  const dbClientSpy = jest.spyOn(dynamoHelper, "dbClient");

  beforeEach(() => {
    dbClientSpy.mockReturnValue(({
      batchWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports function", () => {
    expect(typeof dynamoHelper.batchDeleteItems).toBe("function");
  });

  test("promise rejection", async () => {
    clientSpy.mockReturnValue(({
      batchWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue([]),
      }),
    } as unknown) as DocumentClient);
    await expect(dynamoHelper.batchDeleteItems([{}, {}])).rejects.toStrictEqual(
      []
    );
  });

  test("chunks items to bits of 25 items", async () => {
    await dynamoHelper.batchDeleteItems([{}, {}]);
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(1);

    await dynamoHelper.batchDeleteItems(fill(Array(50), {}));
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(3);

    await dynamoHelper.batchDeleteItems(fill(Array(201), {}));
    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledTimes(12);
  });

  test("uses batchWrite correctly", async () => {
    await dynamoHelper.batchDeleteItems([
      { pk: "x", sk: "1" },
      { pk: "y", sk: "2" },
    ]);

    expect(dynamoHelper.dbClient.batchWrite).toHaveBeenCalledWith({
      RequestItems: {
        [tableName]: [
          {
            DeleteRequest: {
              Key: { pk: "x", sk: "1" },
            },
          },
          {
            DeleteRequest: {
              Key: { pk: "y", sk: "2" },
            },
          },
        ],
      },
    } as BatchWriteItemInput);
  });
});

import DynamoHelper from "..";
import { Where } from "../types";
import { QueryOutput, QueryInput } from "aws-sdk/clients/dynamodb";

describe("query", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.query = jest.fn().mockImplementation(() => {
      return {
        promise: jest.fn().mockResolvedValue({ Items: [] }),
      };
    });
  });

  test("exports method", () => {
    expect(typeof dynamoHelper.query).toBe("function");
  });

  test("generates valid query table params", () => {
    dynamoHelper.query({
      where: {
        pk: "xxxx",
      },
    });

    expect(dynamoHelper.dbClient.query).toHaveBeenCalledWith({
      TableName: tableName,
      KeyConditionExpression: "#PK = :pk",
      ExpressionAttributeNames: {
        "#PK": "pk",
      },
      ExpressionAttributeValues: {
        ":pk": "xxxx",
      },
    });
  });

  test("throws error on invalid input", async () => {
    await expect(
      dynamoHelper.query({
        where: {
          pk: {
            beginsWith: "product",
          },
        } as Where<any>,
      })
    ).rejects.toThrowError("Partition key condition can only be a string");
  });

  test("returns list of items, empty if no result", async () => {
    const results = await dynamoHelper.query({
      where: {
        pk: "xxxx",
      },
    });

    expect(results.length).toBe(0);
  });

  test("uses provided index name to query", () => {
    dynamoHelper.query(
      {
        where: {
          sk: "xxxx",
        },
      },
      "reverse"
    );

    expect(dynamoHelper.dbClient.query).toHaveBeenCalledWith({
      TableName: tableName,
      IndexName: "reverse",
      KeyConditionExpression: "#SK = :sk",
      ExpressionAttributeNames: {
        "#SK": "sk",
      },
      ExpressionAttributeValues: {
        ":sk": "xxxx",
      },
    });
  });

  test("returns all matches if pagination is not enabled", async () => {
    dynamoHelper.dbClient.query = jest
      .fn()
      .mockImplementation((params: QueryInput) => {
        const isFirstRequest = params.ExclusiveStartKey === undefined;
        return {
          promise: jest.fn().mockResolvedValue({
            Items: [isFirstRequest ? { id: "xxxx" } : { id: "yyyy" }],
            LastEvaluatedKey: isFirstRequest ? { pk: "xxxx" } : undefined,
          } as QueryOutput),
        };
      });

    await dynamoHelper.query({
      where: { pk: "xxxx" },
    });
    expect(dynamoHelper.dbClient.query).toHaveBeenCalledTimes(2);
  });
});

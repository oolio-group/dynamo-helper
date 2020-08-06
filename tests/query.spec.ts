import fill from "lodash/fill";
import config from "@hitz-group/config";
import { ProductModel } from "@hitz-group/types";
import {
  BatchGetItemInput,
  DocumentClient,
  QueryOutput,
} from "aws-sdk/clients/dynamodb";
import * as client from "../lib";
import { batchGetItems, exists, getItem, query } from "../lib/query/query";
import { QueryInput, Where } from "../lib/types";

const TABLE_NAME = client.tableName;

describe("query", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      query: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Items: [] }),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports method", () => {
    expect(typeof query).toBe("function");
  });

  test("generates valid query table params", () => {
    const dbClient = client.getClient();

    query({
      where: {
        pk: "xxxx",
      },
    });

    expect(dbClient.query).toHaveBeenCalledWith({
      TableName: config.table.name,
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
      query({
        where: {
          pk: {
            beginsWith: "product",
          },
        } as Where<ProductModel>,
      })
    ).rejects.toThrowError("Partition key condition can only be a string");
  });

  test("returns list of items, empty if no result", async () => {
    const results = await query({
      where: {
        pk: "xxxx",
      },
    });

    expect(results.length).toBe(0);
  });

  test("uses provided index name to query", () => {
    const dbClient = client.getClient();

    query(
      {
        where: {
          sk: "xxxx",
        },
      },
      "reverse"
    );

    expect(dbClient.query).toHaveBeenCalledWith({
      TableName: config.table.name,
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
    clientSpy.mockReturnValue(({
      query: jest.fn().mockImplementation((params: QueryInput) => {
        const isFirstRequest = params.ExclusiveStartKey === undefined;
        return {
          promise: jest.fn().mockResolvedValue({
            Items: [isFirstRequest ? { id: "xxxx" } : { id: "yyyy" }],
            LastEvaluatedKey: isFirstRequest ? { pk: "xxxx" } : undefined,
          } as QueryOutput),
        };
      }),
    } as unknown) as DocumentClient);

    const dbClient = client.getClient();
    await query({
      where: { pk: "xxxx" },
    });
    expect(dbClient.query).toHaveBeenCalledTimes(2);
  });
});

describe("getItem", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      get: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null }),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports getItem function", () => {
    expect(typeof getItem).toBe("function");
  });

  test("validates arguments", async () => {
    await expect(getItem(undefined, undefined)).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, undefined"
    );
    await expect(getItem(null, null)).rejects.toThrowError(
      "Expected two arguments of type string, string received object, object"
    );
    await expect(getItem("null", null)).rejects.toThrowError(
      "Expected two arguments of type string, string received string, object"
    );
    await expect(getItem(undefined, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, string"
    );
    await expect(getItem(2 as never, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received number, string"
    );
    await expect(getItem("", "")).rejects.toThrowError(
      "Expected both arguments to have length greater than 0"
    );
  });

  test("returns null if item not found", async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(getItem("xxxx", "yyyy")).resolves.toBe(null);
  });

  test("returns first item if found", async () => {
    // If query result is not empty getItem returns first item in list
    clientSpy.mockReturnValue(({
      get: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: { id: "xxxx" } }),
      }),
    } as unknown) as DocumentClient);
    await expect(getItem("xxxx", "yyyy")).resolves.toStrictEqual({
      id: "xxxx",
    });
  });

  test("fields to project", async () => {
    const dbClient = client.getClient();
    await getItem("xxxx", "yyyy", ["id"]);
    expect(dbClient.get).toHaveBeenCalledWith({
      TableName: config.table.name,
      Key: {
        pk: "xxxx",
        sk: "yyyy",
      },
      ProjectionExpression: "id",
    });
  });
});

describe("exists", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      get: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: null }),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports exists function", () => {
    expect(typeof exists).toBe("function");
  });

  test("validates arguments", async () => {
    await expect(exists(undefined, undefined)).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, undefined"
    );
    await expect(exists(null, null)).rejects.toThrowError(
      "Expected two arguments of type string, string received object, object"
    );
    await expect(exists("null", null)).rejects.toThrowError(
      "Expected two arguments of type string, string received string, object"
    );
    await expect(exists(undefined, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, string"
    );
    await expect(exists(2 as never, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received number, string"
    );
    await expect(exists("", "")).rejects.toThrowError(
      "Expected both arguments to have length greater than 0"
    );
  });

  test("returns boolean value", async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(exists("xxxx", "yyyy")).resolves.toBe(false);

    clientSpy.mockReturnValue(({
      get: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: { id: "xxxx" } }),
      }),
    } as unknown) as DocumentClient);
    await expect(exists("xxxx", "yyyy")).resolves.toBe(true);
  });
});

describe("batchGetItems", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Responses: { TABLE_NAME: [] } }),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports exists function", () => {
    expect(typeof batchGetItems).toBe("function");
  });

  test("returns list of matching items", async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);

    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Responses: { [TABLE_NAME]: [{ id: "xxxx" }] },
        }),
      }),
    } as unknown) as DocumentClient);
    await expect(
      batchGetItems([{ pk: "xxxx", sk: "yyyy" }])
    ).resolves.toHaveLength(1);
  });

  test("returns empty if no result found", async () => {
    await expect(batchGetItems([])).resolves.toHaveLength(0);

    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Responses: {},
        }),
      }),
    } as unknown) as DocumentClient);
    await expect(
      batchGetItems([{ pk: "xxxx", sk: "yyyy" }])
    ).resolves.toHaveLength(0);
  });

  test("chunks requests into 100s", async () => {
    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockImplementation((params: BatchGetItemInput) => {
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [TABLE_NAME]: params.RequestItems[TABLE_NAME].Keys,
            },
          }),
        };
      }),
    } as unknown) as DocumentClient);

    const dbClient = client.getClient();

    await expect(batchGetItems([{}, {}]));
    expect(dbClient.batchGet).toHaveBeenCalledTimes(1);
    await expect(batchGetItems(fill(Array(100), {})));
    expect(dbClient.batchGet).toHaveBeenCalledTimes(2);
    const results = await batchGetItems(fill(Array(301), {}));
    expect(dbClient.batchGet).toHaveBeenCalledTimes(6);
    expect(results).toHaveLength(301);
  });

  test("returns all matches if pagination is not enabled", async () => {
    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockImplementation((params: BatchGetItemInput) => {
        const isFirstRequest =
          params.RequestItems[TABLE_NAME].Keys[0].pk === "xxxx";
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [TABLE_NAME]: [isFirstRequest ? { id: "xxxx" } : { id: "yyyy" }],
            },
            UnprocessedKeys: {
              [TABLE_NAME]: {
                Keys: isFirstRequest ? [{ pk: "aaaa", sk: "bbbb" }] : [],
              },
            },
          }),
        };
      }),
    } as unknown) as DocumentClient);

    const dbClient = client.getClient();
    await batchGetItems([
      { pk: "xxxx", sk: "yyyy" },
      { pk: "aaaa", sk: "bbbb" },
    ]);
    expect(dbClient.batchGet).toHaveBeenCalledTimes(2);
  });

  test("fields to project", async () => {
    const dbClient = client.getClient();
    await batchGetItems([{ pk: "xxxx", sk: "yyyy" }], ["id"]);
    expect(dbClient.batchGet).toHaveBeenCalledWith({
      RequestItems: {
        [config.table.name]: {
          Keys: [{ pk: "xxxx", sk: "yyyy" }],
          ProjectionExpression: "id",
        },
      },
    });
  });
});

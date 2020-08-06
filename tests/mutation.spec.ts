import { fill } from "lodash";
import config from "@hitz-group/config";
import {
  DocumentClient,
  PutItemInput,
  TransactWriteItemsInput,
  DeleteItemInput,
  BatchWriteItemInput,
} from "aws-sdk/clients/dynamodb";
import * as client from "../lib";
import {
  putItem,
  transactPutItems,
  deleteItem,
  batchPutItems,
} from "../lib/mutation";

describe("putItem", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      put: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports function", () => {
    expect(typeof putItem).toBe("function");
  });

  test("validates input", () => {
    expect(() => putItem(undefined)).toThrowError(
      "Expected on argument of type object received undefined"
    );
    expect(() => putItem("" as never)).toThrowError(
      "Expected on argument of type object received string"
    );
    expect(() => putItem(2 as never)).toThrowError(
      "Expected on argument of type object received number"
    );
    expect(() => putItem(null)).toThrowError(
      "Expected on argument of type object received null"
    );
    expect(() => putItem(NaN as never)).toThrowError(
      "Expected on argument of type object received number"
    );
  });

  test("uses put to write item to db", async () => {
    await putItem({ pk: "xxxx", sk: "yyyy", id: "xxxx" });
    expect(client.getClient().put).toHaveBeenCalledWith({
      Item: { pk: "xxxx", sk: "yyyy", id: "xxxx" },
      TableName: config.table.name,
    } as PutItemInput);
  });

  test("promise rejection", async () => {
    clientSpy.mockReturnValue(({
      put: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue({}),
      }),
    } as unknown) as DocumentClient);

    await expect(
      putItem({ pk: "xxxx", sk: "yyyy", id: "xxxx" })
    ).rejects.toStrictEqual({});
  });
});

describe("transactPutItems", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      transactWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports function", () => {
    expect(typeof transactPutItems).toBe("function");
  });

  test("promise rejection", async () => {
    clientSpy.mockReturnValue(({
      transactWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue({}),
      }),
    } as unknown) as DocumentClient);

    await expect(
      transactPutItems([{ pk: "xxxx", sk: "yyyy", id: "xxxx" }])
    ).rejects.toStrictEqual({});
  });

  test("uses transactWrite", async () => {
    await transactPutItems([
      { pk: "1", sk: "a", id: "1" },
      { pk: "2", sk: "b", id: "2" },
    ]);
    expect(client.getClient().transactWrite).toHaveBeenCalledWith({
      TransactItems: [
        {
          Put: {
            Item: { pk: "1", sk: "a", id: "1" },
            TableName: config.table.name,
          },
        },
        {
          Put: {
            Item: { pk: "2", sk: "b", id: "2" },
            TableName: config.table.name,
          },
        },
      ],
    } as TransactWriteItemsInput);
  });
});

describe("deleteItem", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      delete: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports function", () => {
    expect(typeof deleteItem).toBe("function");
  });

  test("promise rejection", async () => {
    clientSpy.mockReturnValue(({
      delete: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue({}),
      }),
    } as unknown) as DocumentClient);

    await expect(deleteItem("xxxx", "yyyy")).rejects.toStrictEqual({});
  });

  test("uses delete correctly", async () => {
    await deleteItem("xxxx", "yyyy");
    expect(client.getClient().delete).toHaveBeenCalledWith({
      TableName: config.table.name,
      Key: {
        pk: "xxxx",
        sk: "yyyy",
      },
    } as DeleteItemInput);
  });
});

describe("batchPutItems", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
    clientSpy.mockReturnValue(({
      batchWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      }),
    } as unknown) as DocumentClient);
  });

  test("exports function", () => {
    expect(typeof batchPutItems).toBe("function");
  });

  test("promise rejection", async () => {
    clientSpy.mockReturnValue(({
      batchWrite: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue([]),
      }),
    } as unknown) as DocumentClient);
    await expect(batchPutItems([{}, {}])).rejects.toStrictEqual([]);
  });

  test("chunks items to bits of 25 items", async () => {
    await batchPutItems([{}, {}]);
    expect(client.getClient().batchWrite).toHaveBeenCalledTimes(1);

    await batchPutItems(fill(Array(50), {}));
    expect(client.getClient().batchWrite).toHaveBeenCalledTimes(3);

    await batchPutItems(fill(Array(201), {}));
    expect(client.getClient().batchWrite).toHaveBeenCalledTimes(12);
  });

  test("uses batchWrite correctly", async () => {
    await batchPutItems([
      { pk: "x", sk: "1" },
      { pk: "y", sk: "2" },
    ]);

    expect(client.getClient().batchWrite).toHaveBeenCalledWith({
      RequestItems: {
        [client.tableName]: [
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

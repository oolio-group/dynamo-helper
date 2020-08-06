import { BatchGetItemInput, DocumentClient } from "aws-sdk/clients/dynamodb";
import range from "lodash/range";
import * as client from "..";
import { batchExists } from "./batchExists";
const TABLE_NAME = client.tableName;

describe("batchExists", () => {
  const clientSpy = jest.spyOn(client, "getClient");

  beforeEach(() => {
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
  });

  test("returns empty if all keys exist", async () => {
    await expect(
      batchExists([
        { pk: "1", sk: "2" },
        { pk: "3", sk: "4" },
      ])
    ).resolves.toHaveLength(0);
  });

  test("returns not found keys if not all items exist", async () => {
    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockImplementation((params: BatchGetItemInput) => {
        const keys = params.RequestItems[TABLE_NAME].Keys;
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [TABLE_NAME]: keys.slice(0, 1),
            },
          }),
        };
      }),
    } as unknown) as DocumentClient);

    await expect(
      batchExists([
        { pk: "1", sk: "2" },
        { pk: "3", sk: "4" },
      ])
    ).resolves.toEqual([{ pk: "3", sk: "4" }]);
  });

  test("with 100 items", async () => {
    clientSpy.mockReturnValue(({
      batchGet: jest.fn().mockImplementation((params: BatchGetItemInput) => {
        const keys = params.RequestItems[TABLE_NAME].Keys;
        return {
          promise: jest.fn().mockResolvedValue({
            Responses: {
              [TABLE_NAME]: keys.slice(0, Math.floor(keys.length / 2)),
            },
          }),
        };
      }),
    } as unknown) as DocumentClient);

    const keys = range(100).map((i) => ({ pk: i + "pk", sk: i + "sk" }));

    await expect(batchExists(keys)).resolves.toEqual(keys.slice(50));
  });
});

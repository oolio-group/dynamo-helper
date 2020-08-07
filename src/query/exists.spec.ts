import DynamoHelper from "..";

describe("exists", () => {
  const tableName = "tillpos-development";
  const dynamoHelper = new DynamoHelper({
    region: "ap-south-1",
    tableName,
    tableIndexes: {},
  });

  beforeEach(() => {
    dynamoHelper.dbClient.get = jest.fn().mockImplementation(() => {
      return {
        promise: jest.fn().mockResolvedValue({ Item: null }),
      };
    });
  });

  test("exports exists function", () => {
    expect(typeof dynamoHelper.exists).toBe("function");
  });

  test("validates arguments", async () => {
    await expect(
      dynamoHelper.exists(undefined, undefined)
    ).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, undefined"
    );
    await expect(dynamoHelper.exists(null, null)).rejects.toThrowError(
      "Expected two arguments of type string, string received object, object"
    );
    await expect(dynamoHelper.exists("null", null)).rejects.toThrowError(
      "Expected two arguments of type string, string received string, object"
    );
    await expect(dynamoHelper.exists(undefined, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, string"
    );
    await expect(dynamoHelper.exists(2 as never, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received number, string"
    );
    await expect(dynamoHelper.exists("", "")).rejects.toThrowError(
      "Expected both arguments to have length greater than 0"
    );
  });

  test("returns boolean value", async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(dynamoHelper.exists("xxxx", "yyyy")).resolves.toBe(false);

    dynamoHelper.dbClient.get = jest.fn().mockImplementation(() => {
      return {
        promise: jest.fn().mockResolvedValue({ Item: { id: "xxxx" } }),
      };
    });

    await expect(dynamoHelper.exists("xxxx", "yyyy")).resolves.toBe(true);
  });
});

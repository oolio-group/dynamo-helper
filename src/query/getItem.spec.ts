import DynamoHelper from "..";
describe("getItem", () => {
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

  test("exports getItem function", () => {
    expect(typeof dynamoHelper.getItem).toBe("function");
  });

  test("validates arguments", async () => {
    await expect(
      dynamoHelper.getItem(undefined, undefined)
    ).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, undefined"
    );
    await expect(dynamoHelper.getItem(null, null)).rejects.toThrowError(
      "Expected two arguments of type string, string received object, object"
    );
    await expect(dynamoHelper.getItem("null", null)).rejects.toThrowError(
      "Expected two arguments of type string, string received string, object"
    );
    await expect(dynamoHelper.getItem(undefined, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received undefined, string"
    );
    await expect(dynamoHelper.getItem(2 as never, "")).rejects.toThrowError(
      "Expected two arguments of type string, string received number, string"
    );
    await expect(dynamoHelper.getItem("", "")).rejects.toThrowError(
      "Expected both arguments to have length greater than 0"
    );
  });

  test("returns null if item not found", async () => {
    // No results found, hence empty list.
    // getItem will return null in this case
    await expect(dynamoHelper.getItem("xxxx", "yyyy")).resolves.toBe(null);
  });

  test("returns first item if found", async () => {
    // If query result is not empty getItem returns first item in list
    dynamoHelper.dbClient.get = jest.fn().mockImplementation(() => {
      return {
        promise: jest.fn().mockResolvedValue({ Item: { id: "xxxx" } }),
      };
    });
    await expect(dynamoHelper.getItem("xxxx", "yyyy")).resolves.toStrictEqual({
      id: "xxxx",
    });
  });

  test("fields to project", async () => {
    await dynamoHelper.getItem("xxxx", "yyyy", ["id"]);
    expect(dynamoHelper.dbClient.get).toHaveBeenCalledWith({
      TableName: tableName,
      Key: {
        pk: "xxxx",
        sk: "yyyy",
      },
      ProjectionExpression: "id",
    });
  });
});

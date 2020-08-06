import { getClient } from "../lib";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

jest.mock("aws-sdk/clients/dynamodb", () => ({
  DocumentClient: jest.fn().mockImplementation(),
}));

describe("Document Client", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("exports getClient", () => {
    expect(typeof getClient).toBe("function");
  });

  test("returns DynamoDB client", () => {
    const client = getClient();
    expect(typeof client).toBe("object");
    expect(client instanceof DocumentClient).toBe(true);
  });

  test("returns cached client when called next time", () => {
    getClient();
    getClient();
    getClient();
    // Check how many times the constructor has been initialized
    expect(DocumentClient).toHaveBeenCalledTimes(1);
  });
});

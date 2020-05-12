import { RetryCollection } from "../../Services/RetryCollection";
import { ICollection } from "../../Services/ICollection";
import { mock, anything, when, instance, verify } from "ts-mockito";
import { MongoError, InsertOneWriteOpResult } from "mongodb";
import { expect } from "chai";

describe("RetryCollection", async function (): Promise<void> {
  it("Retries an insert with a delay when the collection throws 16500",async function () {
    this.timeout(5000);
    const mockCollection = mock<ICollection>();
    const expectedResult = createOneInsertResult();
    const expectedDoc = {key:"value"};
    when(mockCollection.insertOne(expectedDoc, anything()))
    .thenThrow(new MongoError({code: 16500}))
    .thenThrow(new MongoError({code: 16500}))
    .thenResolve(expectedResult);
    const collection = new RetryCollection(instance(mockCollection));
    
    const startTime = Date.now();
    const result = await collection.insertOne(expectedDoc);
    const elapsedTime = Date.now() - startTime;

    expect(result).is.equal(expectedResult);
    verify(mockCollection.insertOne(expectedDoc, anything())).thrice();
    expect(elapsedTime).is.greaterThan(2000);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createOneInsertResult(): InsertOneWriteOpResult<any> {
    return {
      insertedCount: 1,
      ops: [],
      insertedId: {},
      connection: {},
      result: { ok: 1, n: 1 }
    };
  }
});
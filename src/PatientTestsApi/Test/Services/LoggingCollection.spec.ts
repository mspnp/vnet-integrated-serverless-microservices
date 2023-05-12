import { ICollection } from "../../Services/ICollection";
import { mock, anything, instance, when, capture } from "ts-mockito";
import { InsertOneResult, ObjectId } from "mongodb";
import { IAppInsightsService } from "../../Services/app-insights/app-insights-service";
import { LoggingCollection } from "../../Services/LoggingCollection";
import { expect } from "chai";
import { AppInsightsFixture } from "../Fixtures/AppInsightsServiceFixture";

describe("LoggingCollection", async function (): Promise<void> {
  it("Tracks dependencies for succesful database calls", async function(): Promise<void> {
    const mockCollection = mock<ICollection>();
    const expectedResult = createOneInsertResult();
    const expectedDoc = {key:"value"};
    when(mockCollection.insertOne(expectedDoc, anything())).thenResolve(expectedResult);
    const mockAppInsightsService = mock<IAppInsightsService>();
    const expectedCollectionName = "collectionName";
    const expectedDbName = "dbName";
    const appInsightsService = instance(mockAppInsightsService);
    const collection = new LoggingCollection(instance(mockCollection), appInsightsService, expectedCollectionName, expectedDbName);
    
    const result = await collection.insertOne(expectedDoc, {});
    
    expect(result).is.equal(expectedResult);

    const [actualTelemetry] = capture(mockAppInsightsService.trackDependency).first();
    expect(actualTelemetry.data).is.equal("{\"insertOne\":{\"options\":{}}}");
    expect(actualTelemetry.dependencyTypeName).is.equal("mongodb");
    expect(actualTelemetry.resultCode).is.equal(0);
    expect(actualTelemetry.success).is.equal(true);
    expect(actualTelemetry.name).is.equal(expectedCollectionName);
    expect(actualTelemetry.target).is.equal(expectedDbName);

  });

  it("Tracks dependencies for failed database calls", async function(): Promise<void> {
    const mockCollection = mock<ICollection>();
    const expectedDoc = {key:"value"};
    const expectedError = new Error("expectedError");
    const expectedErrorString = JSON.stringify(expectedError, Object.getOwnPropertyNames(expectedError));
    when(mockCollection.insertOne(expectedDoc, anything()))
    .thenThrow(expectedError);
    const mockAppInsightsService = new AppInsightsFixture().createAppInsightsMock();
    const expectedCollectionName = "collectionName";
    const expectedDbName = "dbName";
    const appInsightsService = instance(mockAppInsightsService);
    const collection = new LoggingCollection(instance(mockCollection), appInsightsService, expectedCollectionName, expectedDbName);
    
    await expect(collection.insertOne(expectedDoc, {})).to.be.rejectedWith(expectedError);
    
    const [actualTelemetry] = capture(mockAppInsightsService.trackDependency).first();
    expect(actualTelemetry.data).is.equal("{\"insertOne\":{\"options\":{}}}");
    expect(actualTelemetry.dependencyTypeName).is.equal("mongodb");
    expect(actualTelemetry.resultCode).is.equal(expectedErrorString);
    expect(actualTelemetry.success).is.equal(false);
    expect(actualTelemetry.name).is.equal(expectedCollectionName);
    expect(actualTelemetry.target).is.equal(expectedDbName);

  });

  function createOneInsertResult(): InsertOneResult<any> {
    return {
      insertedId: new ObjectId(),
      acknowledged: true
    };
  }
});

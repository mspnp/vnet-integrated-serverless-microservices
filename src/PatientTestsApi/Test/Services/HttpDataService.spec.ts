import Axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { expect } from "chai";
import * as HttpStatus from "http-status-codes";
import { } from "mocha";
import { anything, verify, instance, capture, reset } from "ts-mockito";
import { HttpDataService } from "../../Services/HttpDataService";
import { DownstreamError } from "../../Models/DownstreamError";
import { AppInsightsFixture } from "../Fixtures/AppInsightsServiceFixture";



/** Dummy class for mock response */
interface ISuperHeroResponse {
  heros: {id: number;
    name: string;}[];
}

const expectedTrackingHeaders = {
  "request-id": "",
  "traceparent": "",
  "x-ms-request-id": "",
  "x-ms-request-root-id": ""
};

const appInsightsMock = new AppInsightsFixture().createAppInsightsMock(expectedTrackingHeaders);
function createDataService(): HttpDataService {
  return new HttpDataService(Axios, instance(appInsightsMock));
}

describe("HttpDataService", () => {
  const expectedUrl = new URL("http://localhost:8080");
  it("should return body when receives 200 response", async () => {
    const mock = new MockAdapter(Axios);
    const mockResponseBody: ISuperHeroResponse = { heros: [{ id: 1, name: "Superman" }] };
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.OK, mockResponseBody);
    const service = createDataService();

    const response = await service.makeHttpGetCall(expectedUrl);

    expect(response.status).to.be.equal(HttpStatus.StatusCodes.OK);
    expect(response.body).to.deep.equal(mockResponseBody);
  });

  it("should return response body when not found response has a body", async () => {
    const mock = new MockAdapter(Axios);
    const mockResponseBody = { error: "Test Not Found" };
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.NOT_FOUND, mockResponseBody);
    const service = createDataService();

    await expect(service.makeHttpGetCall(expectedUrl))
      .to.be.rejectedWith(DownstreamError, 
        "API Call Failed.\n{\"error\":\"Test Not Found\"}\n{\"body\":{\"error\":\"Test Not Found\"},\"status\":404,\"headers\":{}}");
    
  });

  it("should return generic message when no data exists", async () => {
    const mock = new MockAdapter(Axios);
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.NOT_FOUND, undefined);
    const service = createDataService();

    await expect(service.makeHttpGetCall(expectedUrl))
      .to.be.rejectedWith(DownstreamError, 
        "API Call Failed.\nRequest failed with status code 404\n{\"body\":{},\"status\":404,\"headers\":{}}");
  });

  it("should add correlation headers using tracedata from app insights service", async function (): Promise<void> {
    const mock = new MockAdapter(Axios);
    const mockResponseBody: ISuperHeroResponse = { heros: [{ id: 1, name: "Superman" }] };
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.OK, mockResponseBody);
    const service = createDataService();

    await service.makeHttpGetCall(expectedUrl);
    expect(mock.history.get).to.not.be.empty;
    const actualRequest = mock.history.get[0];
    if (actualRequest.headers)
    {
      expect(Object.keys(actualRequest.headers)).to.include.members(Object.keys(expectedTrackingHeaders));
      // Object.keys(expectedTrackingHeaders).forEach((key) => {
      //   expect(actualRequest.headers).to.have.members(key);
      // });
      
      //expect(Object.keys(actualHeaders)).to.include.members(Object.keys(expectedTrackingHeaders));
    }
  });

  it("should track dependency on app insights service for succesful request", async function (): Promise<void> {
    reset(appInsightsMock);
    const mock = new MockAdapter(Axios);
    const mockResponseBody: ISuperHeroResponse = { heros: [{ id: 1, name: "Superman" }] };
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.OK, mockResponseBody);
    const service = createDataService();

    await service.makeHttpGetCall(expectedUrl);

    const [dependency] = capture(appInsightsMock.trackDependency).first();
    expect (dependency).is.not.null;
    expect(dependency.data).is.equal("get http://localhost:8080/");
    expect(dependency.dependencyTypeName).is.equal("HTTP");
    expect(dependency.duration).is.greaterThan(0);
    expect(dependency.target).is.equal("localhost");
    expect(dependency.resultCode).is.equal(200);
    expect(dependency.success).is.equal(true);
    expect(dependency.name).is.equal("/");
    verify(appInsightsMock.trackDependency(anything())).once();
  });

  it("should track dependency on app insights service for failed request", async function (): Promise<void> {
    reset(appInsightsMock);
    const mock = new MockAdapter(Axios);
    mock.onGet(expectedUrl.toString()).reply(HttpStatus.StatusCodes.NOT_FOUND, undefined);
    const service = createDataService();

    await expect(service.makeHttpGetCall(expectedUrl)).to.eventually.be.rejected;

    const [dependency] = capture(appInsightsMock.trackDependency).first();
    expect (dependency).is.not.null;
    expect(dependency.data).is.equal("get http://localhost:8080/");
    expect(dependency.dependencyTypeName).is.equal("HTTP");
    expect(dependency.duration).is.greaterThan(0);
    expect(dependency.target).is.equal("localhost");
    expect(dependency.resultCode).is.equal(404);
    expect(dependency.success).is.equal(false);
    expect(dependency.name).is.equal("/");
    verify(appInsightsMock.trackDependency(anything())).once();
  });

});


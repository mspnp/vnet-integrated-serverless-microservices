import { mock, instance, anything, verify, capture, when } from "ts-mockito";
import { ITestDataService } from "../../Services/ITestDataService";
import { IAuditService } from "../../Services/IAuditService";
import { TestFixture } from "../Fixtures/TestFixture";
import { HttpRequest } from "@azure/functions";
import { expect } from "chai";
import { TestController } from "../../Controllers/TestController";
import * as HttpStatus from "http-status-codes";
import { v4 as uuidv4 } from "uuid";
import { BadRequestResponse } from "../../Models/BadRequestResponse";
import { DownstreamError } from "../../Models/DownstreamError";
import { ITest } from "../../Models/ITest";
import { AuditingErrorResponse } from "../../Models/AuditingErrorResponse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestRequest(body: any = TestFixture.createTestForCreatingInDb()): HttpRequest {
  const request: HttpRequest = {
    body,
    headers: {},
    method: "POST",
    url: "",
    query: {},
    params: { patientId: body.patientId }
  };
  delete request.body.patientId;
  return request;
}

function createController(dataService?: ITestDataService, auditService?: IAuditService): TestController {
  if (!dataService) {
    dataService = mock<ITestDataService>();
  }
  if (!auditService) {
    auditService = mock<IAuditService>();
  }
  return new TestController(dataService, auditService);
}

describe("TestController", async function (): Promise<void> {
  it("Parses the test and creates it using the dataservice.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createTestRequest();

    const response = await controller.createTest(request);

    verify(dataServiceMock.insertTest(anything())).once();
    const [argument] = capture(dataServiceMock.insertTest).first();
    expect(argument.id).is.not.null;
    expect(response.body).is.not.null;
    expect(response.status).is.equal(HttpStatus.CREATED);
  });

  it("Returns Bad request if test request has an id set.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createTestRequest();
    request.body.id = uuidv4();
    
    const response = await controller.createTest(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("Id unexpected.");
  });

  it("Returns Bad request if test request has lastUpdated.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createTestRequest();
    request.body.lastUpdated = new Date();
    
    const response = await controller.createTest(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("lastUpdated unexpected.");
  });

  it("Returns Bad request if test request can not be parsed.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createTestRequest({});
    
    const response = await controller.createTest(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("\"patientId\" is required");
  });

  it("Creates an audit request", async function(): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const controller = createController(undefined, instance(auditServiceMock));
    const request = createTestRequest();

    const response = await controller.createTest(request);

    verify(auditServiceMock.LogAuditRecord(anything())).once();
    const [auditRecord] = capture(auditServiceMock.LogAuditRecord).first();

    expect(auditRecord.operation).is.equal("create");
    expect(auditRecord.type).is.equal("test");
    expect(auditRecord.id).is.equal((response.body as ITest).id);   
  });

  it ("Does not create a test if the audit request fails.", async function(): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const expectedError = new DownstreamError("expectedEror", {body: {}, headers: {},status: HttpStatus.NOT_FOUND });
    when(auditServiceMock.LogAuditRecord).thenThrow(expectedError);
    const testDataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(testDataServiceMock), instance(auditServiceMock));
    const request = createTestRequest();

    const response = await controller.createTest(request);

    verify(testDataServiceMock.insertTest(anything())).never();
    expect(response).to.be.instanceOf(AuditingErrorResponse);
    expect(response.body).to.match(/^Error creating audit log:/i);
  });
});
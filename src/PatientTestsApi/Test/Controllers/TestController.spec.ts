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
import { ApiResponse } from "../../Models/ApiResponse";
import { NotFoundResponse } from "../../Models/NotFoundResponse";

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

function createGetRequest(params = {}): HttpRequest {
  const request: HttpRequest = {
    body: {},
    headers: {},
    method: "GET",
    url: "",
    query: {},
    params
  };
  return request;
}

function createController(dataService?: ITestDataService, auditService?: IAuditService): TestController {
  if (!dataService) {
    dataService = mock<ITestDataService>();
    when(dataService.findTests(anything(), anything())).thenResolve([TestFixture.createTest()]);
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

  it("Returns BadRequest if patient id not passed in to load in the route parameters.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createGetRequest();
    
    const result = await controller.loadTests(request);
    expect(result).to.be.instanceOf(BadRequestResponse);
    expect(result.body).to.equal("patientId not specified.");
  });

  it ("Returns all tests for a given patient if no test id is specified.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const patientId = uuidv4();
    const expectedTests = TestFixture.createTests([uuidv4(), uuidv4()]);
    when(dataServiceMock.findTests(patientId, undefined)).thenResolve(expectedTests);
    const controller = createController(instance(dataServiceMock));
    const request = createGetRequest({patientId});
    
    const result = await controller.loadTests(request);
    
    expect(result).to.be.instanceOf(ApiResponse);
    expect(result.body).to.deep.equal(expectedTests);
  });

  it ("Returns the requested test if patient id and test id is specified.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const patientId = uuidv4();
    const testId = uuidv4();
    const expectedTests = [TestFixture.createTest()];
    when(dataServiceMock.findTests(patientId, testId)).thenResolve(expectedTests);
    const controller = createController(instance(dataServiceMock));
    const request = createGetRequest({patientId, testId});
    
    const result = await controller.loadTests(request);
    
    expect(result).to.be.instanceOf(ApiResponse);
    expect(result.body).to.deep.equal(expectedTests[0]);
  });

  it ("Returns not found if patient id and test id is specified but no tests exist.", async function (): Promise<void> {
    const dataServiceMock = mock<ITestDataService>();
    const patientId = uuidv4();
    const testId = uuidv4();
    when(dataServiceMock.findTests(patientId, testId)).thenResolve(null);
    const controller = createController(instance(dataServiceMock));
    const request = createGetRequest({patientId, testId});
    
    const result = await controller.loadTests(request);
    expect(result).to.be.instanceOf(NotFoundResponse);
    
  });
  
  it ("Creates an audit record when a single testsis loaded.", async function (): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const patientId = uuidv4();
    const testId = uuidv4();
    const request = createGetRequest({patientId, testId});
    const dataServiceMock = mock<ITestDataService>();
    when(dataServiceMock.findTests(patientId, testId)).thenResolve(TestFixture.createTests([testId]));
    const controller = createController(instance(dataServiceMock), instance(auditServiceMock));
    
    await controller.loadTests(request);

    verify(auditServiceMock.LogAuditRecord(anything())).once();
    const [auditRecord] = capture(auditServiceMock.LogAuditRecord).first();

    expect(auditRecord.operation).is.equal("read");
    expect(auditRecord.type).is.equal("test");
    expect(auditRecord.id).is.equal(`["${testId}"]`);
  });
  
  it ("Creates an audit record when all tests for a patient is loaded.", async function (): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const expectedTests = TestFixture.createTests([uuidv4(), uuidv4()]);
    const patientId = uuidv4();
    const dataServiceMock = mock<ITestDataService>();
    when(dataServiceMock.findTests(patientId, undefined)).thenResolve(expectedTests);

    const controller = createController(instance(dataServiceMock), instance(auditServiceMock));
    const request = createGetRequest({patientId});
    
    await controller.loadTests(request);

    verify(auditServiceMock.LogAuditRecord(anything())).once();
    const [auditRecord] = capture(auditServiceMock.LogAuditRecord).first();

    expect(auditRecord.operation).is.equal("read");
    expect(auditRecord.type).is.equal("test");
    expect(auditRecord.id).is.deep.equal(`["${expectedTests[0].id}","${expectedTests[1].id}"]`);
  });  
});

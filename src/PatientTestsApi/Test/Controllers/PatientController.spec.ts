import { anything, capture, mock, verify, instance, when } from "ts-mockito";
import { PatientController } from "../../Controllers/PatientController";
import { HttpRequest } from "@azure/functions";
import { IPatientDataService } from "../../Services/IPatientDataService";
import { expect } from "chai";
import { BadRequestResponse } from "../../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";
import { PatientFixture } from "../Fixtures/PatientFixture";
import { IAuditService } from "../../Services/IAuditService";
import { IPatient } from "../../Models/IPatient";
import { DownstreamError } from "../../Models/DownstreamError";
import * as HttpStatus from "http-status-codes";
import { AuditingErrorResponse } from "../../Models/AuditingErrorResponse";
import { NotFoundResponse } from "../../Models/NotFoundResponse";
import { UpdateFailedError } from "../../Models/UpdateFailedError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPatientRequest(body: any = PatientFixture.createPatientForCreatingInDb()): HttpRequest {
  return {
    body,
    headers: {},
    method: "POST",
    url: "",
    query: {},
    params: {}
  };
}

function createEmptyRequest(): HttpRequest {
  return {
    method: "GET",
    url: "",
    headers: {},
    query: {},
    params: {}
  };
}

function createController(dataService?: IPatientDataService, auditService?: IAuditService): PatientController {
  if (!dataService) {
    dataService = mock<IPatientDataService>();
  }
  if (!auditService) {
    auditService = mock<IAuditService>();
  }
  return new PatientController(dataService, auditService);
}

describe("PatientController", async function (): Promise<void> {
  it("Parses the patient and creates it using the dataservice.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();

    const response = await controller.createPatient(request);

    verify(dataServiceMock.insertPatient(anything())).once();
    const [argument] = capture(dataServiceMock.insertPatient).first();
    expect(argument.id).is.not.null;
    expect(response.body).is.not.null;
    expect(response.status).is.equal(HttpStatus.CREATED);
  });

  it("Returns Bad request if patient request has an id set.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();
    request.body.id = uuidv4();
    
    const response = await controller.createPatient(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("Id unexpected.");
  });

  it("Returns Bad request if patient request has lastUpdated.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();
    request.body.lastUpdated = new Date();
    
    const response = await controller.createPatient(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("lastUpdated unexpected.");
  });

  it("Returns Bad request if patient request can not be parsed.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest({});
    
    const response = await controller.createPatient(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("\"firstName\" is required");
  });

  it("Creates an audit request", async function(): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const controller = createController(undefined, instance(auditServiceMock));
    const request = createPatientRequest();

    const response = await controller.createPatient(request);

    verify(auditServiceMock.LogAuditRecord(anything())).once();
    const [auditRecord] = capture(auditServiceMock.LogAuditRecord).first();

    expect(auditRecord.operation).is.equal("create");
    expect(auditRecord.type).is.equal("patient");
    expect(auditRecord.id).is.equal((response.body as IPatient).id);   
  });

  it ("Does not create a patient if the audit request fails.", async function(): Promise<void> {
    const auditServiceMock = mock<IAuditService>();
    const expectedError = new DownstreamError("expectedEror", {body: {}, headers: {},status: HttpStatus.NOT_FOUND });
    when(auditServiceMock.LogAuditRecord).thenThrow(expectedError);
    const patientDataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(patientDataServiceMock), instance(auditServiceMock));
    const request = createPatientRequest();

    const response = await controller.createPatient(request);

    verify(patientDataServiceMock.insertPatient(anything())).never();
    expect(response).to.be.instanceOf(AuditingErrorResponse);
    expect(response.body).to.match(/^Error creating audit log:/i);
  });

  it("Returns BadRequest if patient id not passed in to find.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createEmptyRequest();
    
    const result = await controller.findPatient(request);
    expect(result).to.be.instanceOf(BadRequestResponse);
    expect(result.body).to.equal("Missing registration id");
  });

  it("Returns NotFound if patient is not found.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createEmptyRequest();

    // configure request
    request.params["patientId"] = "0";

    // response
    when(dataServiceMock.findPatient(anything())).thenResolve(null);
    
    const result = await controller.findPatient(request);
    expect(result).to.be.an.instanceOf(NotFoundResponse);
    expect(result.body).to.equal("Patient not found");
  });

  it("Returns a patient with the right id.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createEmptyRequest();

    // configure request
    request.params["patientId"] = "1";

    // response
    const patient = PatientFixture.createPatient();
    when(dataServiceMock.findPatient(anything())).thenResolve(patient);
    
    const result = await controller.findPatient(request);
    const patientResult = result.body as IPatient;
    expect(result.status).to.equal(HttpStatus.OK);
    expect(patientResult.id).to.equal(PatientFixture.CreatePatientId);
  });

  it("Fails updating an invalid patient.", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();

    // configure request
    request.body.firstName = null;

    // call update
    const result = await controller.updatePatient(request);
    expect(result).to.be.instanceOf(BadRequestResponse);
  });

  it("Fails updating patient with invalid URL id", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();

    // configure request
    request.params["patientId"] = '1';

    // call update
    const result = await controller.updatePatient(request);
    expect(result).to.be.instanceOf(BadRequestResponse);
    expect(result.body).to.equal("Inconsistent registration IDs");
  });

  it("Handles a failed update", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();

    // configure request
    request.body.id = uuidv4();
    request.params["patientId"] = request.body.id;

    // configure mock
    when(dataServiceMock.updatePatient(anything())).thenThrow(new UpdateFailedError());

    // call update
    try {
      const result = await controller.updatePatient(request);
    }
    catch (e) {
      expect(e).to.be.instanceOf(UpdateFailedError);
    }
  });

  it("Updates a patient", async function (): Promise<void> {
    const dataServiceMock = mock<IPatientDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createPatientRequest();

    // configure request
    request.body.id = uuidv4();
    request.params["patientId"] = request.body.id;

    // configure mock
    const patient = PatientFixture.createPatient();
    patient.id = request.body.id;
    when(dataServiceMock.updatePatient(anything())).thenResolve(patient.id!);

    // call update
    const result = await controller.updatePatient(request);
    expect(result).not.to.be.null;
    
    // deep check
    const requestedPatient = request.body as IPatient;
    const receivedPatient = result.body as IPatient;
    patient.lastUpdated = receivedPatient.lastUpdated;
    expect(receivedPatient).to.be.deep.equal(requestedPatient);
  });
});

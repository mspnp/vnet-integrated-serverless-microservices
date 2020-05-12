import { anything, capture, mock, verify, instance } from "ts-mockito";
import { PatientController } from "../../Controllers/PatientController";
import { HttpRequest } from "@azure/functions";
import { IPatientDataService } from "../../Services/IPatientDataService";
import { expect } from "chai";
import { BadRequestResponse } from "../../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";
import { PatientFixture } from "../Fixtures/PatientFixture";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPatientRequest (body: any = PatientFixture.createPatientForCreatingInDb()): HttpRequest {
  return {
    body,
    headers: {},
    method: "POST",
    url: "",
    query: {},
    params: {}
  };
}

function createController (dataService?: IPatientDataService): PatientController {
  if (!dataService){
    dataService = mock<IPatientDataService>();
  }
  return new PatientController(dataService);
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
    expect(response.status).is.equal(201);
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
});

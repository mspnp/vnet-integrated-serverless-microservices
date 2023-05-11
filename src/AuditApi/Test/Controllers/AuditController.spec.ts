import { anything, capture, mock, verify, instance } from "ts-mockito";
import { AuditController } from "../../Controllers/AuditController";
import { HttpRequest, Form } from "@azure/functions";
import { IAuditDataService } from "../../Services/IAuditDataService";
import { expect } from "chai";
import { BadRequestResponse } from "../../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";
import { AuditRecordFixture } from "../Fixtures/AuditRecordFixture";


function createAuditRequest (body: any = AuditRecordFixture.createAuditRecordForCreatingInDb()): HttpRequest {
  
  return {
    body,
    headers: {},
    method: "POST",
    url: "",
    query: {},
    params: {},
    get: function(field) {return field; },
    user: null,
    parseFormBody() {
      return mock<Form>();
    },
  };
}

function createController (dataService?: IAuditDataService): AuditController {
  if (!dataService){
    dataService = mock<IAuditDataService>();
  }
  return new AuditController(dataService);
}

describe("AuditController", async function (): Promise<void> {
  it("Parses the audit record and creates it using the dataservice.", async function (): Promise<void> {
    const dataServiceMock = mock<IAuditDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createAuditRequest();

    const response = await controller.createAuditRecord(request);

    verify(dataServiceMock.insertAuditRecord(anything())).once();
    const [argument] = capture(dataServiceMock.insertAuditRecord).first();
    expect(argument.id).is.not.null;
    expect(response.body).is.not.null;
    expect(response.status).is.equal(201);
  });

  it("Returns Bad request if audit request has an id set.", async function (): Promise<void> {
    const dataServiceMock = mock<IAuditDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createAuditRequest();
    request.body.id = uuidv4();
    
    const response = await controller.createAuditRecord(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("Id unexpected.");
  });

  it("Returns Bad request if audit request has createddate.", async function (): Promise<void> {
    const dataServiceMock = mock<IAuditDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createAuditRequest();
    request.body.createdDate = new Date();
    
    const response = await controller.createAuditRecord(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("createdDate unexpected.");
  });

  it("Returns Bad request if audit request can not be parsed.", async function (): Promise<void> {
    const dataServiceMock = mock<IAuditDataService>();
    const controller = createController(instance(dataServiceMock));
    const request = createAuditRequest({});
        
    const response = await controller.createAuditRecord(request);

    expect(response).to.be.instanceOf(BadRequestResponse);
    expect(response.body).to.equal("\"sourceSystemName\" is required");
  });
});

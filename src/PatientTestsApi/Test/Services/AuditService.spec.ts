import { HttpDataService } from "../../Services/HttpDataService";
import { mock, capture, instance } from "ts-mockito";
import { expect } from "chai";
import { AuditService } from "../../Services/AuditService";
import { FileSettings } from "../Fixtures/FileSettings";
import { IDevSettings } from "../Fixtures/IDevSettings";
import { AppInsightsFixture } from "../Fixtures/AppInsightsServiceFixture";
import Axios from "axios";

describe("AuditDataService", async function (): Promise<void> {

  const settings: IDevSettings = new FileSettings();

  function createAuditService(dataService: HttpDataService): AuditService {
    return new AuditService(dataService, settings);
  }

  const expectedResource = {
    type: "resourceType",
    id: "id",
    operation: "operation",
  };

  it("posts to the audit api with expected parameters", async function (): Promise<void> {
    if (!settings.auditAPIUrl) {
      this.skip();
    }
    const dataServiceMock = mock(HttpDataService);
    const service = createAuditService(instance(dataServiceMock));
    
    await service.LogAuditRecord(expectedResource);

    const [url, headers, payload] = capture(
      dataServiceMock.makeHttpPostCall
    ).first();

    expect(url).to.deep.equal(settings.auditAPIUrl);
    expect(headers["x-functions-key"]).to.equal(settings.auditAuthKey);
    expect(payload).to.deep.equal({
      sourceSystemName: "PatientTestApi",
      resource: {
        type: expectedResource.type,
        id: expectedResource.id,
        operation: expectedResource.operation,
      },
    });
  });

  it("posts to a real audit API without errors #integration", async function (): Promise<void> {
    this.timeout(10000);
    if (!settings.enableAuditIntegrationTests) {
      this.skip();
    }
    expect(settings.auditAPIUrl).not.undefined;
    
    const appInsights = new AppInsightsFixture().createAppInsightsMock();
    const service = createAuditService(new HttpDataService(Axios.create(), instance(appInsights)));

    await service.LogAuditRecord(expectedResource);


  });
});

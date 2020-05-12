import { DBFixture } from "../Fixtures/DBFixture";
import { AuditDataService } from "../../Services/AuditDataService";
import { expect } from "chai";
import { AuditRecordFixture } from "../Fixtures/AuditRecordFixture";

const db = new DBFixture();

describe("AuditDataService #integration", async function (): Promise<void> {
  before(async function (): Promise<void> {
    await db.init();
    await db.cleanAuditRecords();
  });

  it("Can create an audit record", async function (): Promise<void> {
    const dataService: AuditDataService = createAuditDataService();
    const expectedAuditRecord = AuditRecordFixture.createAuditRecord();
    
    const id = await dataService.insertAuditRecord(expectedAuditRecord);

    const createdAuditRecord = await db.loadAuditRecord(id);
    Object.keys(expectedAuditRecord).forEach(key => {
      expect(createdAuditRecord[key]).deep.equal(expectedAuditRecord[key]);
    });
    expect(createdAuditRecord._id).is.equal(id);
    expect(createdAuditRecord._shardKey).is.equal(id);
  }); 

  after(async function (): Promise<void> {
    await db.cleanAuditRecords();
    await db.close();
  });
});

const createAuditDataService = function (): AuditDataService {
  return new AuditDataService(db.createAuditCollection());
};
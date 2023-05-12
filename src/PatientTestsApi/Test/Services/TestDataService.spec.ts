import { DBFixture } from "../Fixtures/DBFixture";
import { expect } from "chai";
import { TestDataService } from "../../Services/TestDataService";
import { TestFixture } from "../Fixtures/TestFixture";

const db = new DBFixture();

describe("TestDataService #integration", async function (): Promise<void> {
  before(async function (): Promise<void> {
    await db.init();
    await db.cleanTests();
  });
  
  it("Can create and find a specific test", async function (): Promise<void> {
    const dataService: TestDataService = createTestDataService();
    const expectedTest = TestFixture.createTest();
    expectedTest.id = DBFixture.createId();
    const id = await dataService.insertTest(expectedTest);

    // test via standard db query to see first if the record is consistent
    const rawTest = await db.loadTest(id);
    expect(rawTest).not.null;
    expect(rawTest!._id.toString("base64")).is.equal(id);
    expect(rawTest!._shardKey).is.equal(expectedTest.patientId);

    //now test the find specific test
    const actualTests = await dataService.findTests(expectedTest.patientId, id);

    expect(actualTests).not.null;
    expect(actualTests!.length).to.be.equal(1);
    const actualTest = actualTests![0];
    Object.keys(actualTest).forEach(key => {
      expect(actualTest[key]).deep.equal(expectedTest[key], key);
    });

    expect(actualTest._id).to.be.undefined;
    expect(actualTest._shardKey).to.be.undefined;
  });  
  
  it("Can create and find all tests for a patient", async function (): Promise<void> {
    const dataService: TestDataService = createTestDataService();
    const expectedIds = [DBFixture.createId(), DBFixture.createId()];
    const expectedTests = TestFixture.createTests(expectedIds);
    await dataService.insertTest(expectedTests[0]);
    await dataService.insertTest(expectedTests[1]);
    
    
    const patientId = expectedTests[0].patientId;
    const actualTests = await dataService.findTests(patientId, undefined);
    expect(actualTests).not.null;
    expect(actualTests!.length).to.be.at.least(2);
    expect(actualTests!.every(item => item.patientId == patientId)).to.be.true;
    expect(actualTests!.map(item => item.id)).to.include.members(expectedIds);
  });  
  
  after(async function (): Promise<void> {
    await db.cleanTests();
    await db.close();
  });

});

const createTestDataService = function (): TestDataService {
  return new TestDataService(db.createTestCollection());
};
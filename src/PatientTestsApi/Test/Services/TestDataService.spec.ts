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

  
  it("Can create a test", async function (): Promise<void> {
    const dataService: TestDataService = createTestDataService();
    const expectedTest = TestFixture.createTest();
    expectedTest.id = "newId";    
    const id = await dataService.insertTest(expectedTest);

    // test via standard db query to see first if the record is consistent
    const createdTest = await db.loadTest(id);
    Object.keys(expectedTest).forEach(key => {
      expect(createdTest[key]).deep.equal(expectedTest[key]);
    });
    expect(createdTest._id).is.equal(id);
    expect(createdTest._shardKey).is.equal(expectedTest.patientId);

    // // test finding patient via data service
    // const foundPatient = await dataService.findPatient(id);
    // expect(foundPatient).not.to.be.null;
    // Object.keys(foundPatient!).forEach(key => {
    //   expect(foundPatient![key]).deep.equal(expectedPatient[key]);
    // });
    // expect(foundPatient!.id).is.equal(id);

    // // assert db properties haven't leaked
    // expect(foundPatient!._id).to.be.undefined;
    // expect(foundPatient!._shardKey).to.be.undefined;
  });  

  after(async function (): Promise<void> {
    await db.cleanPatients();
    await db.close();
  });

});

const createTestDataService = function (): TestDataService {
  return new TestDataService(db.createTestCollection());
};
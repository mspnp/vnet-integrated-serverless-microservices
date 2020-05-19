import { DBFixture } from "../Fixtures/DBFixture";
import { PatientDataService } from "../../Services/PatientDataService";
import { expect } from "chai";
import { PatientFixture } from "../Fixtures/PatientFixture";

const db = new DBFixture();

describe("PatientDataService #integration", async function (): Promise<void> {
  before(async function (): Promise<void> {
    await db.init();
    await db.cleanPatients();
  });

  it("Won't find a patient that does not exist", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const id = "-123";

    // test
    const createdPatient = await dataService.findPatient(id);
    expect(createdPatient).to.be.null;
  }); 

  it("Can create and find a patient", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const expectedPatient = PatientFixture.createPatient();
    expectedPatient.id = "newId";    
    const id = await dataService.insertPatient(expectedPatient);

    // test via standard db query to see first if the record is consistent
    const createdPatient = await db.loadPatient(id);
    Object.keys(expectedPatient).forEach(key => {
      expect(createdPatient[key]).deep.equal(expectedPatient[key]);
    });
    expect(createdPatient._id).is.equal(id);
    expect(createdPatient._shardKey).is.equal(id);

    // test finding patient via data service
    const foundPatient = await dataService.findPatient(id);
    expect(foundPatient).not.to.be.null;
    Object.keys(foundPatient!).forEach(key => {
      expect(foundPatient![key]).deep.equal(expectedPatient[key]);
    });
    expect(foundPatient!.id).is.equal(id);

    // assert db properties haven't leaked
    expect(foundPatient!._id).to.be.undefined;
    expect(foundPatient!._shardKey).to.be.undefined;
  }); 

  after(async function (): Promise<void> {
    await db.cleanPatients();
    await db.close();
  });
});

const createPatientDataService = function (): PatientDataService {
  return new PatientDataService(db.createPatientCollection());
};
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

  it("Can create a patient", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const expectedPatient = PatientFixture.createPatient();
    
    const id = await dataService.insertPatient(expectedPatient);

    const createdPatient = await db.loadPatient(id);
    Object.keys(expectedPatient).forEach(key => {
      expect(createdPatient[key]).deep.equal(expectedPatient[key]);
    });
    expect(createdPatient._id).is.equal(id);
    expect(createdPatient._shardKey).is.equal(id);
  }); 

  after(async function (): Promise<void> {
    await db.cleanPatients();
    await db.close();
  });
});

const createPatientDataService = function (): PatientDataService {
  return new PatientDataService(db.createPatientCollection());
};
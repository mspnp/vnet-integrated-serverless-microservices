import { DBFixture } from "../Fixtures/DBFixture";
import { PatientDataService } from "../../Services/PatientDataService";
import { expect } from "chai";
import { PatientFixture } from "../Fixtures/PatientFixture";
import { IPatientSearch } from "../../Models/IPatient";

const db = new DBFixture();

const createIds = [
  "651384ac30304ad7",
  "35ddcd3162924476",
  "e80ad928b63d4f0d"];
const searchIds = [
  "9839c9ee11b545e6",
  "3e5d2b595d974d5a",
  "710702b837ee4d2b"];

  
describe("PatientDataService #integration", async function (): Promise<void> {
  before(async function (): Promise<void> {
    await db.init();
    await db.cleanPatients();
  });

  it("Won't find a patient that does not exist", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const id = "0000000000000000";

    // test
    const createdPatient = await dataService.findPatient(id);
    expect(createdPatient).to.be.null;
  }); 

  it("Can create and find a patient", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const expectedPatient = PatientFixture.createPatient();
    expectedPatient.id = "8b4c4f0b8eec1d9d";    
    const id = await dataService.insertPatient(expectedPatient);

    // test via standard db query to see first if the record is consistent
    const createdPatient = await db.loadPatient(id);
    expect(createdPatient).not.null;
    Object.keys(expectedPatient).forEach(key => {
      expect(createdPatient![key]).deep.equal(expectedPatient[key]);
    });
    expect(createdPatient!._id.toString("base64")).is.equal(id);
    expect(createdPatient!._shardKey).is.equal(id);

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
    expect(foundPatient!._dateOfBirthDate).to.be.undefined;
  });
  
  it("Can create and update a patient", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const expectedPatient = PatientFixture.createPatient();
    expectedPatient.id = "29ab5ea044d498e8";
    const id = await dataService.insertPatient(expectedPatient);

    // test updating patient via data service
    expectedPatient.firstName = "testFirstName";
    const updatedId = await dataService.updatePatient(expectedPatient);
    expect(updatedId).not.to.be.null;

    // look it up and see if it's updated
    const foundPatient = await dataService.findPatient(id);
    Object.keys(foundPatient!).forEach(key => {
      expect(foundPatient![key]).deep.equal(expectedPatient[key]);
    });
    expect(foundPatient!.id).is.equal(id);
  }); 

  it("Can create and search for patients - simple criteria", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const patients = [];

    // create sample patients
    
    createIds.forEach(async id => {
      const expectedPatient = PatientFixture.createPatientForCreatingInDb();
      expectedPatient.id = id;    
      await dataService.insertPatient(expectedPatient);  
      patients.push(expectedPatient);
    });
    
    // search for simple fields
    const fullPatientSearch = PatientFixture.createSimplePatientSearch();

    // loop through all fields and test queries one by one
    Object.keys(fullPatientSearch).forEach(async x => {
      if (!(fullPatientSearch[x] instanceof Date) && !(Array.isArray(fullPatientSearch[x]))) {
        const patientSearch: IPatientSearch = {};
        patientSearch[x] = fullPatientSearch[x];
        const searchResult = await dataService.searchPatient(patientSearch);
        expect(searchResult.length).to.be.at.least(patients.length);
      }
    });
  }); 

  it("Should not find patients - simple criteria", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();

    // search for simple fields
    const fullPatientSearch = PatientFixture.createSimplePatientSearch();

    // loop through all fields and test queries one by one
    Object.keys(fullPatientSearch).forEach(async x => {
      if (!(fullPatientSearch[x] instanceof Date) && !(Array.isArray(fullPatientSearch[x]))) {
        const patientSearch: IPatientSearch = {};
        patientSearch[x] = "random-string";
        const searchResult = await dataService.searchPatient(patientSearch);
        expect(searchResult.length).to.equal(0);
      }
    });
  }); 

  it("Can create and search for patients - date criteria", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    const patients = [];

    // create sample patients
    searchIds.forEach(async (id) => {
      const expectedPatient = PatientFixture.createPatientForCreatingInDb();
      expectedPatient.id = id;    
      expectedPatient.dateOfBirth = "1808-05-23";
      await dataService.insertPatient(expectedPatient);  
      patients.push(expectedPatient);
    });
    
    // search for date field from
    let patientSearch: IPatientSearch = {
      dateOfBirthFrom: new Date("1808-05-23")
    };
    let searchResult = await dataService.searchPatient(patientSearch);
    expect(searchResult.length).to.be.at.least(patients.length);

    // search for date field to
    patientSearch = {
      dateOfBirthTo: new Date("1808-05-23")
    };
    searchResult = await dataService.searchPatient(patientSearch);
    expect(searchResult.length).to.equal(patients.length);

    // search for both date fields
    patientSearch = {
      dateOfBirthTo: new Date("1808-05-24"),
      dateOfBirthFrom: new Date("1808-05-22")
    };
    searchResult = await dataService.searchPatient(patientSearch);
    expect(searchResult.length).to.equal(patients.length);
  });

  it("Should not find patients - date criteria", async function (): Promise<void> {
    const dataService: PatientDataService = createPatientDataService();
    
    // search for both date fields
    const patientSearch = {
      dateOfBirthTo: new Date("1708-05-24"),
      dateOfBirthFrom: new Date("1708-05-22")
    };
    const searchResult = await dataService.searchPatient(patientSearch);
    expect(searchResult.length).to.equal(0);
  });

  after(async function (): Promise<void> {
    await db.cleanPatients();
    await db.close();
  });
});

const createPatientDataService = function (): PatientDataService {
  return new PatientDataService(db.createPatientCollection());
};
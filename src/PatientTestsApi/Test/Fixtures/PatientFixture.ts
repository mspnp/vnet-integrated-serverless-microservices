import { IPatient, IPatientSearch } from "../../Models/IPatient";
import { Gender } from "../../Models/Gender";

export class PatientFixture {
  public static readonly CreatePatientId = "df5ad95e-05e9-4a22-aac0-f74164c623ac";

  public static createPatientForCreatingInDb(): IPatient {
    return {
      firstName: "FirstName",
      lastName: "LastName",
      fullName: "FullName",
      gender: Gender.Male,
      dateOfBirth: "1908-05-23",
      postCode: "0001",
      insuranceNumber: "ins0001",
      preferredContactNumber: "01012345567"
    };
  }

  public static createPatient(): IPatient {
    const patient: IPatient = PatientFixture.createPatientForCreatingInDb();
    patient.id = PatientFixture.CreatePatientId;
    patient.lastUpdated = new Date("2020-05-07T04:20:44.454Z");
    return patient;
  }

  public static createSimplePatientSearch(): IPatientSearch {
    const patient: IPatient = PatientFixture.createPatientForCreatingInDb();
    delete patient.dateOfBirth;

    return patient as IPatientSearch;
  }
}


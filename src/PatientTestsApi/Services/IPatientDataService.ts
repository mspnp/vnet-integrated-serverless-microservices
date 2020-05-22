import { IPatient, IPatientSearch } from "../Models/IPatient";

export interface IPatientDataService {
  insertPatient(patient: IPatient): Promise<string>;
  findPatient(id: string): Promise<IPatient | null>;
  updatePatient(patient: IPatient): Promise<string | null>;
  searchPatient(patientSearch: IPatientSearch): Promise<IPatient[]>;
}

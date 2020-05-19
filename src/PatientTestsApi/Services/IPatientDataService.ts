import { IPatient } from "../Models/IPatient";

export interface IPatientDataService {
  insertPatient(patient: IPatient): Promise<string>;
  findPatient(id: string): Promise<IPatient | null>;
}

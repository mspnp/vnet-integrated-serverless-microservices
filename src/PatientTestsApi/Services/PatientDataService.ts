import { IPatientDataService } from "./IPatientDataService";
import { IPatient, IPatientSearch } from "../Models/IPatient";
import { ICollection } from "./ICollection";
import { InsertFailedError } from "../Models/InsertFailedError";
import { UpdateFailedError } from "../Models/UpdateFailedError";
import { addDateCriteria, createSimpleCriteriaOperatorList, removeUndefinedPropertiesFromObject } from "../Util/Utils";

export class PatientDataService implements IPatientDataService {
  constructor (private readonly collection: ICollection) {

  }

  public async insertPatient(patient: IPatient): Promise<string> {
    const dbPatient: IDBPatient = {
      ...patient,
      _id: patient.id!,
      _shardKey: patient.id!,
      _dateOfBirthDate: new Date(patient.dateOfBirth)
    };

    const result = await this.collection.insertOne(dbPatient);
    if (result.insertedCount > 0) {
      return dbPatient._id;
    }
    else {
      throw new InsertFailedError();
    }
  }

  public async findPatient(id: string): Promise<IPatient | null> {
    const filter = { id };
    const result: IDBPatient = await this.collection.findOne(filter) as IDBPatient;

    if (result) {
      // remove database properties
      return this.createPatient(result);
    }

    return result;
  }

  public async updatePatient(patient: IPatient): Promise<string | null> {
    const dbPatient: IDBPatient = {
      ...patient,
      _id: patient.id!,
      _shardKey: patient.id!,
      _dateOfBirthDate: new Date(patient.dateOfBirth)
    };

    const filter = { _id: dbPatient._id, _shardKey: dbPatient._shardKey };
    const result = await this.collection.updateOne(
      filter,
      {
        $set: patient
      }
    );

    if (result.modifiedCount > 0) {
      return patient.id!;
    }
    else {
      throw new UpdateFailedError();
    }
  }

  // searches patients
  public async searchPatient(patientSearch: IPatientSearch): Promise<IPatient[]> {
    let queryFilter = {};

    // first off, delete all undefined values from the object
    removeUndefinedPropertiesFromObject(patientSearch);

    // if we're not empty, then start putting the query together
    // tslint:disable: no-unsafe-any no-any
    const operatorList = createSimpleCriteriaOperatorList(patientSearch);

    // add dates
    addDateCriteria(patientSearch.dateOfBirthFrom, patientSearch.dateOfBirthTo, "_dateOfBirthDate", operatorList);

    // set up query filter
    if (operatorList.length > 0) {
      queryFilter = {
        $and: operatorList
      };
    }

    const result = await this.collection.findMany(queryFilter);
    
    if (result) {
      return result.map(item => this.createPatient(item));
    }
    return [];
  }

  
  private createPatient (obj: IDBPatient): IPatient {
    // remove database properties
    delete obj._id;
    delete obj._shardKey;
    delete obj._dateOfBirthDate;
    return obj;
  }
}

interface IDBPatient extends IPatient {
  _id: string;
  _shardKey: string;
  _dateOfBirthDate: Date;  
}



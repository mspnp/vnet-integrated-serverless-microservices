import { ITest } from "../Models/ITest";
import { ICollection } from "./ICollection";
import { InsertFailedError } from "../Models/InsertFailedError";
import { ITestDataService } from "./ITestDataService";

export class TestDataService implements ITestDataService {
  constructor (private readonly collection: ICollection) {
  }
  
  public async insertTest(test: ITest): Promise<string> {
    const dbTest: IDBTest = {
      ...test,
      _id: test.id!,
      _shardKey: test.patientId
    };

    const result = await this.collection.insertOne(dbTest);
    if (result.insertedCount > 0) {
      return dbTest._id;
    }
    else {
      throw new InsertFailedError();
    }
  }

}

interface IDBTest extends ITest {
  _id: string;
  _shardKey: string;
}


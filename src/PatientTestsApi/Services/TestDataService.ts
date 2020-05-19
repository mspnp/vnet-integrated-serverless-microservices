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

  public async findTests(patientId: string, testId: string | undefined = undefined): Promise<ITest[] | null> {
    if (testId === undefined) {
      const results = await this.collection.findMany({patientId, _shardKey: patientId});
      if (results != null) {
        return results.map(item => this.createTest(item));
      }
      else {
        return [];
      }
    } else {
      const result = await this.collection.findOne({_id: testId, _shardKey: patientId});
      if (result != null)
        return [this.createTest(result)];
      else 
        return null;
    }
  }


  private createTest(value: IDBTest): ITest {
    delete value._id;
    delete value._shardKey;
    return value;
  }
}

interface IDBTest extends ITest {
  _id: string;
  _shardKey: string;
}


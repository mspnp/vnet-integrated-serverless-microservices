import { ITest } from "../Models/ITest";

export interface ITestDataService {
  insertTest(test: ITest): Promise<string>;
}

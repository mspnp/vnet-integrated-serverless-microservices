import { ITest } from "../Models/ITest";

export interface ITestDataService {
  insertTest(test: ITest): Promise<string>;
  findTests(patientId: string, testId: string | undefined): Promise<ITest[] | null>;
}

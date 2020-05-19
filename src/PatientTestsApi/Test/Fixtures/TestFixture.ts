import { PatientFixture } from "./PatientFixture";
import { ITest } from "../../Models/ITest";

export class TestFixture {
  public static readonly CreateTestId = "df5ad95e-05e9-4a22-aac0-f74164c623ac";

  public static createTestForCreatingInDb(): ITest {
    return {
      patientId: PatientFixture.CreatePatientId,
      performer: "TESTLAB01",
      orderReference: "ORDER01",
      observations: [{
        id: "OBSERVATION-01",
        code: "1554-5",
        measurement: "182 mg/dL",
        interpretation: "N",
        issued: new Date("2002-02-15T07:30:00-04:00"),
        status: "final"
      }]
    };
  }

  public static createTest(): ITest {
    const patient: ITest = TestFixture.createTestForCreatingInDb();
    patient.id = TestFixture.CreateTestId;
    patient.lastUpdated = new Date("2020-05-07T04:20:44.454Z");
    return patient;
  }

  public static createTests(ids: string[]): ITest[] {
    return ids.map(id => {
      const test = TestFixture.createTest();
      test.id = id;
      return test;
    });
  }
}

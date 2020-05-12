import { ISettings } from "./ISettings";

export class EnvironmentSettings implements ISettings {
  public get patientCollection(): string { return "patients";}
  public get patientTestDatabase(): string { return process.env.patient_tests_database || ""; }
  public get mongoConnectionString(): string { return process.env.mongo_connection_string || "";}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(process.env.allow_self_signed_mongo_cert || "false");}

}
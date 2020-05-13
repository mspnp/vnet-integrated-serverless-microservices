import { ISettings } from "./ISettings";

export class EnvironmentSettings implements ISettings {
  public get patientCollection(): string { return "patients";}
  public get patientTestDatabase(): string { return process.env.patient_tests_database || ""; }
  public get mongoConnectionString(): string { return process.env.mongo_connection_string || "";}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(process.env.allow_self_signed_mongo_cert || "false");}
  public get auditAPIUrl(): URL | undefined { 
    try {
      return new URL(process.env.audit_api_url!);
    } catch (e) {
      console.warn("Auditing is not enabled, could not validate auditing url.");
      return undefined;
    } 
  }
  public get auditAuthKey(): string | undefined { return process.env.audit_auth_key;  }
}
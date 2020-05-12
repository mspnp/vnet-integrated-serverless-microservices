import { ISettings } from "./ISettings";

export class EnvironmentSettings implements ISettings {
  public get auditCollection(): string { return "audits";}
  public get auditDatabase(): string { return process.env.audit_database || ""; }
  public get mongoConnectionString(): string { return process.env.mongo_connection_string || "";}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(process.env.allow_self_signed_mongo_cert || "false");}

}
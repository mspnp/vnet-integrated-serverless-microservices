import fs from "fs";
import { IDevSettings } from "./IDevSettings";

export class FileSettings implements IDevSettings {
  private readonly localSettings: {
    patient_tests_database: string;
    mongo_connection_string: string;
    allow_self_signed_mongo_cert: string;
    audit_api_url: string;
    enable_audit_integration_tests: boolean;
    audit_auth_key: string;
  };
  public get patientCollection(): string { return "patients";}
  public get patientTestDatabase(): string { return this.localSettings.patient_tests_database;}
  public get mongoConnectionString(): string { return this.localSettings.mongo_connection_string;}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(this.localSettings.allow_self_signed_mongo_cert || "true");}
  public get auditAPIUrl(): URL | undefined { return (this.localSettings.audit_api_url ? new URL(this.localSettings.audit_api_url) : undefined); }
  public get auditAuthKey(): string | undefined { return this.localSettings.audit_auth_key; }
  public get enableAuditIntegrationTests(): boolean { return this.localSettings.enable_audit_integration_tests; }

  public constructor(filePath = "local.settings.json") {
    const localSettingsContent = fs.readFileSync(filePath).toString();
    this.localSettings = JSON.parse(localSettingsContent).Values;
  }

}
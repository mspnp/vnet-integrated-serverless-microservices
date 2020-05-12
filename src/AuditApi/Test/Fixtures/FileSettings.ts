import { ISettings } from "../../Models/ISettings";
import fs from "fs";

export class FileSettings implements ISettings {
  public get auditCollection(): string { return "audits";}
  public get auditDatabase(): string { return this.localSettings.audit_database;}
  public get mongoConnectionString(): string { return this.localSettings.mongo_connection_string;}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(process.env.allow_self_signed_mongo_cert || "true");}

  private readonly localSettings: {
    audit_database: string;
    mongo_connection_string: string;
  };

  public constructor(filePath = "local.settings.json") {
    const localSettingsContent = fs.readFileSync(filePath).toString();
    this.localSettings = JSON.parse(localSettingsContent).Values;
  }

}
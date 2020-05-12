import { ISettings } from "../../Models/ISettings";
import fs from "fs";

export class FileSettings implements ISettings {
  public get patientCollection(): string { return "patients";}
  public get patientTestDatabase(): string { return this.localSettings.patient_tests_database;}
  public get mongoConnectionString(): string { return this.localSettings.mongo_connection_string;}
  public get allowSelfSignedMongoCert(): boolean { return JSON.parse(process.env.allow_self_signed_mongo_cert || "true");}

  private readonly localSettings: {
    patient_tests_database: string;
    mongo_connection_string: string;
  };

  public constructor(filePath = "local.settings.json") {
    const localSettingsContent = fs.readFileSync(filePath).toString();
    this.localSettings = JSON.parse(localSettingsContent).Values;
  }

}
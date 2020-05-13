import { ISettings } from "../../Models/ISettings";

export interface IDevSettings extends ISettings {
  enableAuditIntegrationTests: boolean;
}
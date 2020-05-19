
export interface ISettings {
  testCollection: string;
  patientCollection: string;
  patientTestDatabase: string;
  mongoConnectionString: string;
  allowSelfSignedMongoCert: boolean;
  auditAPIUrl?: URL;
  auditAuthKey?: string;

}
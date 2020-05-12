export interface ISettings {
  patientCollection: string;
  patientTestDatabase: string;
  mongoConnectionString: string;
  allowSelfSignedMongoCert: boolean;
}
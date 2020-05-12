import { AuditRecordFixture } from "./AuditRecordFixture";
import { Db, MongoClient } from "mongodb";
import { ISettings } from "../../Models/ISettings";
import { ICollection } from "../../Services/ICollection";
import { FileSettings } from "./FileSettings";

export class DBFixture {
  
  public mongoDb: Db;
  public mongoClient: MongoClient;
  public settings: ISettings;

  constructor(){
    this.mongoDb = {} as Db;
    this.mongoClient = {} as MongoClient; 
    this.settings = new FileSettings();
  }

  public async init(): Promise<void> {

    // connect and select database
    this.mongoClient = await MongoClient.connect(this.settings.mongoConnectionString,
      { useUnifiedTopology: true, useNewUrlParser: true, tlsAllowInvalidCertificates: true });
    
    this.mongoDb = this.mongoClient.db(this.settings.auditDatabase);
  }

  public createAuditCollection(): ICollection {
    return this.mongoDb.collection(this.settings.auditCollection);
  }

  public async cleanAuditRecords(): Promise<void> {
    await this.mongoDb.collection(this.settings.auditCollection)
        .deleteOne({ _id: AuditRecordFixture.CreateAuditRecordId, _shardKey: AuditRecordFixture.CreateAuditRecordId });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async loadAuditRecord(id: string): Promise<any> {
    return await this.mongoDb.collection(this.settings.auditCollection).findOne({_id: id});
  }

  public async close(): Promise<void> {
    // close the connection
    await this.mongoClient.close(true);
  }
}
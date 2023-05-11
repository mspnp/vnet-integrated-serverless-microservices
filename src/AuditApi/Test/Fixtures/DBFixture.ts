import { AuditRecordFixture } from "./AuditRecordFixture";
import { Db, Document, MongoClient, ObjectId, WithId } from "mongodb";
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
      {
        tlsAllowInvalidCertificates: this.settings.allowSelfSignedMongoCert
      });
    
    this.mongoDb = this.mongoClient.db(this.settings.auditDatabase);
  }

  public createAuditCollection(): ICollection {
    return this.mongoDb.collection(this.settings.auditCollection);
  }

  public async cleanAuditRecords(): Promise<void> {
    const collection = this.mongoDb.collection<Document>(this.settings.auditCollection);
    await collection
        .deleteOne({ _id: ObjectId.createFromBase64(AuditRecordFixture.CreateAuditRecordId), _shardKey: AuditRecordFixture.CreateAuditRecordId });
  }

  public async loadAuditRecord(id: string): Promise<WithId<Document> | null> {
    return await this.mongoDb.collection(this.settings.auditCollection).findOne({_id: ObjectId.createFromBase64(id)});
  }

  public async close(): Promise<void> {
    // close the connection
    await this.mongoClient.close(true);
  }
}
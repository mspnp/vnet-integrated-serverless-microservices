import { Db, Document, MongoClient, ObjectId, WithId } from "mongodb";
import { ISettings } from "../../Models/ISettings";
import { ICollection, patchMongoCollection } from "../../Services/ICollection";
import { FileSettings } from "./FileSettings";
import { v4 as uuidv4 } from "uuid";

export class DBFixture {
  public mongoDb: Db;
  public mongoClient: MongoClient;
  public settings: ISettings;
  
  public static createId(): string {
    return uuidv4().replaceAll("-", "").substring(0, 16);
  }
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
    
    this.mongoDb = this.mongoClient.db(this.settings.patientTestDatabase);
  }

  public createPatientCollection(): ICollection {
    return this.createCollection(this.settings.patientCollection);
  }

  public async cleanPatients(): Promise<void> {
    await this.mongoDb.collection(this.settings.patientCollection).deleteMany({});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async loadPatient(id: string): Promise<WithId<Document> | null> {
    return await this.mongoDb.collection(this.settings.patientCollection).findOne({_id: ObjectId.createFromBase64(id)});
  }
  
  public createTestCollection(): ICollection {
    return this.createCollection(this.settings.testCollection);
  }

  private createCollection(collectionName: string): ICollection {
    return patchMongoCollection(this.mongoDb.collection(collectionName));
  }

  public async cleanTests(): Promise<void> {
    await this.mongoDb.collection(this.settings.testCollection).deleteMany({});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async loadTest(id: string): Promise<WithId<Document> | null> {
    // todo: check if we need to specify a shard key if we're finding by _id.
    return await this.mongoDb.collection(this.settings.testCollection).findOne({_id: ObjectId.createFromBase64(id)});
  }
  

  public async close(): Promise<void> {
    // close the connection
    await this.mongoClient.close(true);
  }
}
import { PatientController } from "./PatientController";
import { Db, MongoClient } from "mongodb";
import { ISettings } from "../Models/ISettings";
import { ICollection } from "../Services/ICollection";
import { PatientDataService } from "../Services/PatientDataService";
import { EnvironmentSettings } from "../Models/EnvironmentSettings";
import { RetryCollection } from "../Services/RetryCollection";
import { LoggingCollection } from "../Services/LoggingCollection";
import { AppInsightsService } from "../Services/app-insights/app-insights-service";
import { TraceContext, HttpRequest } from "@azure/functions";

export class ControllerFactory {

  private static mongoDb: Promise<Db>;
  private readonly settings: ISettings;

  constructor () {
    this.settings = new EnvironmentSettings();  
  }

  public async createPatientController(functionContext: TraceContext, request: HttpRequest): Promise<PatientController> {
    const appInsightsService = new AppInsightsService(functionContext, request);
    const collection = await this.CreateCollection(this.settings.patientCollection, appInsightsService);
    const dataService: PatientDataService = new PatientDataService(collection);
    return new PatientController(dataService);
  }

  private async CreateCollection(collectionName: string, appInsightsService: AppInsightsService): Promise<ICollection> {
    if (ControllerFactory.mongoDb == null) {
      ControllerFactory.mongoDb = this.createMongoDb();
    }
    const mongoCollection = (await ControllerFactory.mongoDb).collection(collectionName);

    const retryCollection = new RetryCollection(mongoCollection);
    return new LoggingCollection(retryCollection, appInsightsService, collectionName, this.settings.patientTestDatabase);
  }

  private async createMongoDb(): Promise<Db> {
    // connect and select database
    const mongoClient = await MongoClient.connect(this.settings.mongoConnectionString,
      { useUnifiedTopology: true, useNewUrlParser: true, tlsAllowInvalidCertificates: this.settings.allowSelfSignedMongoCert });
    
    return mongoClient.db(this.settings.patientTestDatabase);
  }
}
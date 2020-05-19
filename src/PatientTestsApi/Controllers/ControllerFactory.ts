import { PatientController } from "./PatientController";
import { Db, MongoClient } from "mongodb";
import { ISettings } from "../Models/ISettings";
import { ICollection, patchMongoCollection } from "../Services/ICollection";
import { PatientDataService } from "../Services/PatientDataService";
import { EnvironmentSettings } from "../Models/EnvironmentSettings";
import { RetryCollection } from "../Services/RetryCollection";
import { LoggingCollection } from "../Services/LoggingCollection";
import { AppInsightsService } from "../Services/app-insights/app-insights-service";
import { TraceContext, HttpRequest } from "@azure/functions";
import { AuditService } from "../Services/AuditService";
import Axios, { AxiosInstance } from "axios";
import { HttpDataService } from "../Services/HttpDataService";
import { TestController } from "./TestController";
import { TestDataService } from "../Services/TestDataService";

export class ControllerFactory {
  

  private static mongoDb: Promise<Db>;
  private readonly settings: ISettings;
  private static axiosClient: AxiosInstance;

  constructor () {
    this.settings = new EnvironmentSettings();  
    ControllerFactory.axiosClient = Axios.create();
  }

  public async createPatientController(functionContext: TraceContext, request: HttpRequest): Promise<PatientController> {
    const appInsightsService = new AppInsightsService(functionContext, request);
    const collection = await this.CreateCollection(this.settings.patientCollection, appInsightsService);
    const dataService = new PatientDataService(collection);
    const httpDataService = new HttpDataService(ControllerFactory.axiosClient, appInsightsService);
    const auditService = new AuditService(httpDataService, this.settings);
    return new PatientController(dataService, auditService);
  }

  public async createTestController(functionContext: TraceContext, request: HttpRequest): Promise<TestController> {
    const appInsightsService = new AppInsightsService(functionContext, request);
    const collection = await this.CreateCollection(this.settings.patientCollection, appInsightsService);
    const dataService = new TestDataService(collection);
    const httpDataService = new HttpDataService(ControllerFactory.axiosClient, appInsightsService);
    const auditService = new AuditService(httpDataService, this.settings);
    return new TestController(dataService, auditService);
  }

  private async CreateCollection(collectionName: string, appInsightsService: AppInsightsService): Promise<ICollection> {
    if (ControllerFactory.mongoDb == null) {
      ControllerFactory.mongoDb = this.createMongoDb();
    }
    const mongoCollection = patchMongoCollection((await ControllerFactory.mongoDb).collection(collectionName));

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
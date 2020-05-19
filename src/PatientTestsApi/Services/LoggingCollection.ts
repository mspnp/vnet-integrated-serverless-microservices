/* eslint-disable @typescript-eslint/no-explicit-any */
import { ICollection } from "./ICollection";
import { CollectionInsertOneOptions, 
         FilterQuery, 
         FindOneOptions, 
         InsertOneWriteOpResult,
         UpdateOneOptions,
         UpdateQuery,
         UpdateWriteOpResult } from "mongodb";
import { Timer } from "./app-insights/timer";
import { IDependencyTelemetry, IAppInsightsService } from "./app-insights/app-insights-service";

export class LoggingCollection implements ICollection {
  
  constructor(
    private readonly collection: ICollection,
    private readonly appInsights: IAppInsightsService,
    private readonly collectionName: string,
    private readonly dbName: string) {}
  
  insertOne(
    docs: any,
    options?: CollectionInsertOneOptions | undefined
  ): Promise<InsertOneWriteOpResult<any>> {
    const mongoRequest = JSON.stringify({insertOne: {options}});
    return this.trackDependency(() => this.collection.insertOne(docs, options), mongoRequest);
  }

  public async findOne(filter: FilterQuery<any>, options?: FindOneOptions): Promise<any> {
    const mongoRequest = JSON.stringify({findOne: {filter}});
    return this.trackDependency(() => this.collection.findOne(filter, options), mongoRequest);
  }

  public async findMany(query: FilterQuery<any>, options?: FindOneOptions | undefined): Promise<any[]> {
    const mongoRequest = JSON.stringify({findMany: {query}});
    return this.trackDependency(() => this.collection.findMany(query, options), mongoRequest);
  }

  public async updateOne(
    filter: FilterQuery<any>, 
    update: UpdateQuery<any> | Partial<any>, options?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    const mongoRequest = JSON.stringify({updateOne: {filter}});
    return this.trackDependency(() => this.collection.updateOne(filter, update, options), mongoRequest);
  }

  private async trackDependency<T>(fn: () => Promise<T>, query: string): Promise<T> {
    const timer = new Timer();

    try {
      const result = await fn();
      timer.stop();
      const dependency = this.createDependency(query, timer, 0, true);
      this.appInsights.trackDependency(dependency);
      return result;

    } catch (e) {
      timer.stop();
      const dependency = this.createDependency(query, timer, JSON.stringify(e, Object.getOwnPropertyNames(e)), false);
      this.appInsights.trackDependency(dependency);
      throw e;
    }
  }

  private createDependency(query: string, timer: Timer, resultCode: number | string, success: boolean): IDependencyTelemetry {
    return { data: query,
      dependencyTypeName: "mongodb",
      duration: timer.duration,
      time: timer.endDate,
      resultCode,
      success,
      name: this.collectionName,
      target: this.dbName };
  }
}

import { ICollection } from "./ICollection";
import { InsertOneOptions, InsertOneResult } from "mongodb";
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
    options?: InsertOneOptions | undefined
  ): Promise<InsertOneResult<any>> {
    const mongoRequest = JSON.stringify({insertOne: {options}});
    return this.trackDependency(() => this.collection.insertOne(docs, options), mongoRequest);
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

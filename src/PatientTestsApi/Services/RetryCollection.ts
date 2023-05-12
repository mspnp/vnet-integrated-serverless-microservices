/* eslint-disable @typescript-eslint/no-explicit-any */
import { InsertOneOptions, 
         Filter, 
         FindOptions, 
         InsertOneResult, 
         MongoError,
         UpdateOptions,
         UpdateFilter,
         UpdateResult } from "mongodb";
import { ICollection } from "./ICollection";
import { IRetryPolicy } from "./IRetryPolicy";
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";

export class RetryCollection implements ICollection {
  constructor(private readonly collection: ICollection) {}
  
  public async insertOne(
    docs: any,
    options?: InsertOneOptions | undefined
  ): Promise<InsertOneResult<any>> {
    return this.retryWrapper(
      async (): Promise<any> => this.collection.insertOne(docs, options)
    );
  }

  public async findOne(filter: Filter<any>, options?: FindOptions): Promise<any> {
    return this.retryWrapper(
      async(): Promise<any> => this.collection.findOne(filter, options)
    );
  }

  public async findMany(query: Filter<any>, options?: FindOptions | undefined): Promise<any[]> {
    return this.retryWrapper(
      async (): Promise<any[]> => this.collection.findMany(query, options)
    );
  }
  
  public async updateOne(
    filter: Filter<any>, 
    update: UpdateFilter<any> | Partial<any>, options?: UpdateOptions
  ): Promise<UpdateResult> {
    return this.retryWrapper(
      async (): Promise<UpdateResult> => this.collection.updateOne(filter, update, options)
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle retries for MongoDB
   */
  private async retryWrapper<T>(
    fn: () => Promise<T>,
    retryPolicy?: IRetryPolicy
  ): Promise<T> {
    if (!retryPolicy) {
      retryPolicy = new DefaultRetryPolicy();
    }
    try {
      const response = await fn();
      return response;
    } catch (error) {
      const mongoError = error as MongoError;
      if (mongoError.message === "16500") { //16500 is the error code for tooManyRequests
        const shouldRetry = retryPolicy.shouldRetry();
        if (shouldRetry) {
          await this.delay(retryPolicy.retryAfterMilliSec);
          return this.retryWrapper(fn, retryPolicy);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}



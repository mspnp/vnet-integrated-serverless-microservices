/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionInsertOneOptions, 
         FilterQuery, 
         FindOneOptions, 
         InsertOneWriteOpResult, 
         MongoError,
         UpdateOneOptions,
         UpdateQuery,
         UpdateWriteOpResult } from "mongodb";
import { ICollection } from "./ICollection";
import { IRetryPolicy } from "./IRetryPolicy";
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";

export class RetryCollection implements ICollection {
  constructor(private readonly collection: ICollection) {}
  
  public async insertOne(
    docs: any,
    options?: CollectionInsertOneOptions | undefined
  ): Promise<InsertOneWriteOpResult<any>> {
    return this.retryWrapper(
      async (): Promise<any> => this.collection.insertOne(docs, options)
    );
  }

  public async findOne(filter: FilterQuery<any>, options?: FindOneOptions): Promise<any> {
    return this.retryWrapper(
      async(): Promise<any> => this.collection.findOne(filter, options)
    );
  }

  public async findMany(query: FilterQuery<any>, options?: FindOneOptions | undefined): Promise<any[]> {
    return this.retryWrapper(
      async (): Promise<any[]> => this.collection.findMany(query, options)
    );
  }
  
  public async updateOne(
    filter: FilterQuery<any>, 
    update: UpdateQuery<any> | Partial<any>, options?: UpdateOneOptions
  ): Promise<UpdateWriteOpResult> {
    return this.retryWrapper(
      async (): Promise<UpdateWriteOpResult> => this.collection.updateOne(filter, update, options)
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
      if (mongoError.code === 16500) { //16500 is the error code for tooManyRequests
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



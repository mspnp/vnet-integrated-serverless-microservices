/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionInsertOneOptions, InsertOneWriteOpResult, MongoError } from "mongodb";
import { ICollection } from "./ICollection";
import { IRetryPolicy } from "./IRetryPolicy";
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";

export class RetryCollection implements ICollection {
  constructor(private readonly collection: ICollection) {}

  insertOne(
    docs: any,
    options?: CollectionInsertOneOptions | undefined
  ): Promise<InsertOneWriteOpResult<any>> {
    return this.retryWrapper(
      async (): Promise<any> => this.collection.insertOne(docs, options)
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



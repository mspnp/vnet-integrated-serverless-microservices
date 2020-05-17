/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionInsertOneOptions, InsertOneWriteOpResult, FilterQuery, FindOneOptions } from "mongodb";

export interface ICollection {
  insertOne(docs: any, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult<any>>;
  findOne(filter: FilterQuery<any>, options?: FindOneOptions): Promise<any>;
}

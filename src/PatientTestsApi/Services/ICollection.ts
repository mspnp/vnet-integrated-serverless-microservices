/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionInsertOneOptions, 
         InsertOneWriteOpResult, 
         FilterQuery, 
         FindOneOptions, 
         UpdateQuery, 
         UpdateOneOptions, 
         UpdateWriteOpResult } from "mongodb";

export interface ICollection {
  insertOne(docs: any, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult<any>>;
  findOne(filter: FilterQuery<any>, options?: FindOneOptions): Promise<any>;
  updateOne(filter: FilterQuery<any>, update: UpdateQuery<any> | Partial<any>, options?: UpdateOneOptions): Promise<UpdateWriteOpResult>;
}

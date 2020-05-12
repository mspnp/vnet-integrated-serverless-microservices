/* eslint-disable @typescript-eslint/no-explicit-any */
import { CollectionInsertOneOptions, InsertOneWriteOpResult } from "mongodb";

export interface ICollection {
  insertOne(docs: any, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult<any>>;
}



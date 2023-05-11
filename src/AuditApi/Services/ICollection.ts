import { InsertOneOptions, InsertOneResult } from "mongodb";

export interface ICollection {
  insertOne(docs: any, options?: InsertOneOptions): Promise<InsertOneResult<any>>;
}



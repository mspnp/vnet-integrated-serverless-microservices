/* eslint-disable @typescript-eslint/no-explicit-any */
import { InsertOneOptions, 
         InsertOneResult,
         Filter, 
         FindOptions, 
         UpdateFilter,
         UpdateOptions, 
         UpdateResult, 
         Collection} from "mongodb";

export interface ICollection {
  insertOne(docs: any, options?: InsertOneOptions): Promise<InsertOneResult<any>>;
  findOne(filter: Filter<any>, options?: FindOptions): Promise<any>;
  findMany(query: Filter<any>, options?: FindOptions): Promise<any[]>;
  updateOne(filter: Filter<any>, update: UpdateFilter<any> | Partial<any>, options?: UpdateOptions): Promise<UpdateResult>;
}

export function patchMongoCollection(mongoCollection: Collection<any>): ICollection {
  const patchedCollection = mongoCollection as unknown as ICollection & Collection<any>;
  patchedCollection.findMany = function (query: Filter<any>, options?: FindOptions | undefined): Promise<any[]> {
    return this.find(query, options).toArray();
  };
  return patchedCollection;
}

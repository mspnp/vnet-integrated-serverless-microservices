import { IAuditDataService } from "./IAuditDataService";
import { IAuditRecord } from "../Models/IAuditRecord";
import { ICollection } from "./ICollection";
import { InsertFailedError } from "../Models/InsertFailedError";
import { ObjectId } from "mongodb";

export class AuditDataService implements IAuditDataService {
  constructor (private readonly collection: ICollection) {

  }

  public async insertAuditRecord (auditRecord: IAuditRecord): Promise<string> {
    const dbAuditRecord: IDBAuditRecord = {
      ...auditRecord,
      _id: ObjectId.createFromBase64(auditRecord.id!),
      _shardKey: auditRecord.id!
    };

    const result = await this.collection.insertOne(dbAuditRecord);
    if (result.insertedId == dbAuditRecord._id) {
      return dbAuditRecord._id.toString("base64");
    }
    else {
      throw new InsertFailedError();
    }
  }
}

interface IDBAuditRecord extends IAuditRecord {
  _id: ObjectId;
  _shardKey: string;
}



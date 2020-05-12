import { IAuditDataService } from "./IAuditDataService";
import { IAuditRecord } from "../Models/IAuditRecord";
import { ICollection } from "./ICollection";
import { InsertFailedError } from "../Models/InsertFailedError";

export class AuditDataService implements IAuditDataService {
  constructor (private readonly collection: ICollection) {

  }

  public async insertAuditRecord (auditRecord: IAuditRecord): Promise<string> {
    const dbAuditRecord: IDBAuditRecord = {
      ...auditRecord,
      _id: auditRecord.id!,
      _shardKey: auditRecord.id!
    };

    const result = await this.collection.insertOne(dbAuditRecord);
    if (result.insertedCount > 0) {
      return dbAuditRecord._id;
    }
    else {
      throw new InsertFailedError();
    }
  }
}

interface IDBAuditRecord extends IAuditRecord {
  _id: string;
  _shardKey: string;
}



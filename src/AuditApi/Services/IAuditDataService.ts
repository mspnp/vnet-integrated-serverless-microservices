import { IAuditRecord } from "../Models/IAuditRecord";

export interface IAuditDataService {
    insertAuditRecord(auditRecord: IAuditRecord): Promise<string>;
}

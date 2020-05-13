import { IAuditResource } from "./AuditService";
export interface IAuditService {
  LogAuditRecord(expectedResource: IAuditResource): Promise<void>;
}

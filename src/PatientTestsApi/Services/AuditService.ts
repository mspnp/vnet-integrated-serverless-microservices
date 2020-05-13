import { HttpDataService } from "./HttpDataService";
import { ISettings } from "../Models/ISettings";
import { IAuditService } from "./IAuditService";

export class AuditService implements IAuditService {
  constructor(
    private readonly dataService: HttpDataService,
    private readonly settings: ISettings) {}
  
  public async LogAuditRecord(expectedResource: IAuditResource): Promise<void> {
    if (this.settings.auditAPIUrl){
      const auditRecord: IAuditRecord = { 
        sourceSystemName: "PatientTestApi",
        resource: expectedResource 
      };
      await this.dataService.makeHttpPostCall(this.settings.auditAPIUrl, {"x-functions-key": this.settings.auditAuthKey!}, auditRecord);
    }
  }
}

interface IAuditRecord {
  sourceSystemName: string;
  resource: IAuditResource; 
}

export interface IAuditResource { 
  type: string; 
  id: string; 
  operation: string; 
}


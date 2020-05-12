import { HttpRequest } from "@azure/functions";
import { IAuditRecord, AuditRecordSchema } from "../Models/IAuditRecord";
import { IResponse } from "../Models/IResponse";
import { IAuditDataService } from "../Services/IAuditDataService";
import { CreatedResponse} from "../Models/CreatedResponse";
import { BadRequestResponse } from "../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";

export class AuditController {
  public constructor(
    private readonly auditDataService: IAuditDataService
  ) {}

  public async createAuditRecord(req: HttpRequest): Promise<IResponse> {
    const validationResult = AuditRecordSchema.validate(req.body);
    if (validationResult.error != null) {
      return new BadRequestResponse(validationResult.error.message);
    }

    if (req.body.id != null) {
      return new BadRequestResponse("Id unexpected.");
    }
    if (req.body.createdDate != null) {
      return new BadRequestResponse("createdDate unexpected.");
    }


    const auditRecord = req.body as IAuditRecord || {};
    auditRecord.id = uuidv4();
    auditRecord.createdDate = new Date();

    await this.auditDataService.insertAuditRecord(auditRecord);
    
    return new CreatedResponse(auditRecord);
  }
}



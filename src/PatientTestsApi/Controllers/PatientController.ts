import { HttpRequest } from "@azure/functions";
import { IPatient, PatientSchema } from "../Models/IPatient";
import { IResponse } from "../Models/IResponse";
import { IPatientDataService } from "../Services/IPatientDataService";
import { CreatedResponse} from "../Models/CreatedResponse";
import { BadRequestResponse } from "../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";
import { IAuditService } from "../Services/IAuditService";
import { IAuditResource } from "../Services/AuditService";
import { AuditingErrorResponse } from "../Models/AuditingErrorResponse";
import { NotFoundResponse } from "../Models/NotFoundResponse";
import { ApiResponse } from "../Models/ApiResponse";

export class PatientController {
  public constructor(
    private readonly patientDataService: IPatientDataService,
    private readonly auditService: IAuditService
  ) {}

  public async createPatient(req: HttpRequest): Promise<IResponse> {
    const validationResult = PatientSchema.validate(req.body);
    if (validationResult.error != null) {
      return new BadRequestResponse(validationResult.error.message);
    }

    if (req.body.id != null) {
      return new BadRequestResponse("Id unexpected.");
    }
    if (req.body.lastUpdated != null) {
      return new BadRequestResponse("lastUpdated unexpected.");
    }
   
    const patient = req.body as IPatient || {};
    const newPatientId = uuidv4();
    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(newPatientId, "create"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }
    patient.id = newPatientId;
    patient.lastUpdated = new Date();
    await this.patientDataService.insertPatient(patient);
    
    return new CreatedResponse(patient);
  }

  public async findPatient(req: HttpRequest): Promise<IResponse> {
    const registrationId = req.params["patientId"];

    if (!registrationId || registrationId.length === 0) {
      return new BadRequestResponse("Missing registration id");
    }
   
    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(registrationId, "find"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }
    
    const patient: IPatient | null = await this.patientDataService.findPatient(registrationId);
    
    if (!patient)
      return new NotFoundResponse("Patient not found");
    else
      return new ApiResponse(patient);
  }

  private createAuditResource(newPatientId: string, operation: string): IAuditResource {
    return { 
      id: newPatientId,
      operation,
      type: "patient"
    };
  }
}



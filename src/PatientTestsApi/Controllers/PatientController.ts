import { HttpRequest } from "@azure/functions";
import { IPatient, PatientSchema, IPatientSearch, PatientSearchSchema } from "../Models/IPatient";
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

  // Creates a patient 
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

  // Finds an existing patient in the database
  public async findPatient(req: HttpRequest): Promise<IResponse> {
    const patientId = req.params["patientId"];

    if (!patientId || patientId.length === 0) {
      return new BadRequestResponse("Missing registration id");
    }
   
    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(patientId, "find"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }
    
    const patient: IPatient | null = await this.patientDataService.findPatient(patientId);
    
    if (!patient)
      return new NotFoundResponse("Patient not found");
    else
      return new ApiResponse(patient);
  }

  // Updates an existing patient
  public async updatePatient(req: HttpRequest): Promise<IResponse> {
    const validationResult = PatientSchema.validate(req.body);
    const patientId = req.params["patientId"];

    if (validationResult.error != null) {
      return new BadRequestResponse(validationResult.error.message);
    }

    if (patientId == null || patientId.length == 0) {
      return new BadRequestResponse("Missing ID parameter in the URL");
    }

    // Check if two registration IDs (in URL and data body) exist and are equal
    if (patientId != req.body.id) {
      return new BadRequestResponse("Inconsistent registration IDs");
    }
    
    // get body
    const patient = req.body as IPatient || {};
    
    // audit
    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(patient.id!, "update"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }

    // update patient
    patient.lastUpdated = new Date();
    await this.patientDataService.updatePatient(patient);

    // returns update
    return new ApiResponse(patient);
  }

  // Searches for patients in the database
  public async searchPatient(req: HttpRequest): Promise<IResponse> {
    const validationResult = PatientSearchSchema.validate(req.body);
    
    if (validationResult.error != null) {
      return new BadRequestResponse(validationResult.error.message);
    }
    
    // get body
    const patientSearch = req.body as IPatientSearch;

    try {
      const resource = JSON.stringify(req.body);
      await this.auditService.LogAuditRecord(this.createAuditResource(resource, "search"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }
    
    const patients: IPatient[] = await this.patientDataService.searchPatient(patientSearch);
    
    if (patients.length === 0)
      return new NotFoundResponse("No patients found with provided criteria");
    else
      return new ApiResponse(patients);
  }

  private createAuditResource(newPatientId: string, operation: string): IAuditResource {
    return { 
      id: newPatientId,
      operation,
      type: "patient"
    };
  }
}



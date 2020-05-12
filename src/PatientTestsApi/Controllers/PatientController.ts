import { HttpRequest } from "@azure/functions";
import { IPatient, PatientSchema } from "../Models/IPatient";
import { IResponse } from "../Models/IResponse";
import { IPatientDataService } from "../Services/IPatientDataService";
import { CreatedResponse} from "../Models/CreatedResponse";
import { BadRequestResponse } from "../Models/BadRequestResponse";
import { v4 as uuidv4 } from "uuid";

export class PatientController {
  public constructor(
    private readonly patientDataService: IPatientDataService
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

    req.body.lastUpdated = new Date();

    

    const patient = req.body as IPatient || {};
    patient.id = uuidv4();
    await this.patientDataService.insertPatient(patient);
    
    return new CreatedResponse(patient);
  }
}



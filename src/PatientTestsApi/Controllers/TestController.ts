import { IAuditService } from "../Services/IAuditService";
import { IAuditResource } from "../Services/AuditService";
import { ITestDataService } from "../Services/ITestDataService";
import { HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { IResponse } from "../Models/IResponse";
import { ITest, TestSchema } from "../Models/ITest";
import { BadRequestResponse } from "../Models/BadRequestResponse";
import { AuditingErrorResponse } from "../Models/AuditingErrorResponse";
import { CreatedResponse } from "../Models/CreatedResponse";
import { ApiResponse } from "../Models/ApiResponse";
import { NotFoundResponse } from "../Models/NotFoundResponse";

export class TestController {
  
  public constructor(
    private readonly testDataService: ITestDataService,
    private readonly auditService: IAuditService
  ) {}

  public async createTest(req: HttpRequest): Promise<IResponse> {
    req.body.patientId = req.params.patientId;
    const validationResult = TestSchema.validate(req.body);
    if (validationResult.error != null) {
      return new BadRequestResponse(validationResult.error.message);
    }

    if (req.body.id != null) {
      return new BadRequestResponse("Id unexpected.");
    }
    if (req.body.lastUpdated != null) {
      return new BadRequestResponse("lastUpdated unexpected.");
    }
   
    const test = req.body as ITest || {};
    const newTestId = uuidv4();
    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(newTestId, "create"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }
    test.id = newTestId;
    test.lastUpdated = new Date();
    await this.testDataService.insertTest(test);
    
    return new CreatedResponse(test);
  }

  public async loadTests(request: HttpRequest): Promise<IResponse> {
    if (!request.params.patientId) {
      return Promise.resolve(new BadRequestResponse("patientId not specified."));
    }
    const tests = await this.testDataService.findTests(request.params.patientId, request.params.testId);
    if (tests == null) {
      return new NotFoundResponse("Test not found.");
    }

    try {
      await this.auditService.LogAuditRecord(this.createAuditResource(JSON.stringify(tests.map(test => test.id)), "read"));
    } catch (error) {
      return new AuditingErrorResponse(error);
    }

    return new ApiResponse(tests?.length == 1 ? tests[0] : tests);
  }

  private createAuditResource(newTestId: string, operation: string): IAuditResource {
    return { 
      id: newTestId,
      operation,
      type: "test"
    };
  }
}

import { IResponse } from "./IResponse";
import * as HttpStatus from "http-status-codes";

export class AuditingErrorResponse extends Error implements IResponse {
  public constructor(internalError: Error | undefined) {
    super("Error creating audit log:\n" + (internalError ? JSON.stringify(internalError, Object.getOwnPropertyNames(internalError)) : ""));
    this.body = this.message;
  }
  body: string;
  headers = { "Content-Type": "application/json" };
  status = HttpStatus.INTERNAL_SERVER_ERROR;
}

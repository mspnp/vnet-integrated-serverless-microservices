import { IResponse } from "./IResponse";
import * as HttpStatus from "http-status-codes";

export class BadRequestResponse extends Error implements IResponse {
  public constructor(message: string) {
    super ("Bad request: " + message);
    this.body = message;
  }
  body: string;
  headers = { "Content-Type": "application/json" };
  status = HttpStatus.BAD_REQUEST;
}



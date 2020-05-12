import { IResponse } from "./IResponse";
export class CreatedResponse<T> implements IResponse {
  public constructor(public body: T) {
  }
  headers = { "Content-Type": "application/json" };
  status = 201;
}

import { IResponse } from "./IResponse";

export class DownstreamError extends Error {
  public readonly downstreamResponse: IResponse;
  constructor(message: string, downstreamResponse: IResponse) {
    const errorMessage = `API Call Failed.\n${message}\n${JSON.stringify(downstreamResponse)}`;
    super(errorMessage);
    this.downstreamResponse = downstreamResponse;
  }
}
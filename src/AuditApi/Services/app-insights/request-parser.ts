/**
 * Base class for helpers that read data from HTTP requst/response objects and convert them
 * into the telemetry contract objects.
 */
export abstract class RequestParser {

  protected method: string = '';
  protected url: string = '';
  protected properties: { [key: string]: string } = {};

  /**
   * Gets a url parsed out from request options
   */
  public getUrl(): string {
    return this.url;
  }

}

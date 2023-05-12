import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as HttpStatus from "http-status-codes";
import { URL } from "url";
import { AppInsightsService, IDependencyTelemetry } from "./app-insights/app-insights-service";
import { IHeaders } from "../Models/IHeaders";
import { Timer } from "./app-insights/timer";
import { IResponse } from "../Models/IResponse";
import { DownstreamError } from "../Models/DownstreamError";

/**
 * HTTP Service class for calling external API services
 */
export class HttpDataService {

  constructor(
    private readonly axiosClient: AxiosInstance,
    private readonly appInsightsService: AppInsightsService
  ) { }

  /** Make a HTTP call with GET HTTP method */
  public async makeHttpGetCall<T>(
    url: URL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryParams?: any, headers?: IHeaders): Promise<IResponse> {

    const getCall = (innerUrl: string, requestConfig: AxiosRequestConfig): Promise<AxiosResponse> => this.axiosClient.get<T>(
      innerUrl,
      requestConfig
    );

    return this.axiosHttpCall(url, getCall, queryParams, headers);
  }

  /** Make a HTTP call with PUT HTTP method */
  public async makeHttpPutCall<T>(
    url: URL,
    headers?: IHeaders, payload?: T): Promise<IResponse> {

    const putCall = (innerUrl: string, requestConfig: AxiosRequestConfig): Promise<AxiosResponse> => this.axiosClient.put<T>(
      innerUrl,
      payload,
      requestConfig
    );

    return this.axiosHttpCall(url, putCall, {}, headers);
  }

  /** Make a HTTP call with POST HTTP method */
  public async makeHttpPostCall(
    url: URL,
    headers: IHeaders, payload: unknown): Promise<IResponse> {

    const postCall = (innerUrl: string, requestConfig: AxiosRequestConfig): Promise<AxiosResponse> => this.axiosClient.post(
      innerUrl,
      payload,
      requestConfig
    );

    return this.axiosHttpCall(url, postCall, {}, headers);
  }

  /**
   * Make the http call to the external API service
   * @param url The URL of the endpoint to call
   * @param queryParams Any query Params to send
   * @param headers any HTTP Headers to send
   * @param axiosRequestCallFn The axios operation function
   */
  private async axiosHttpCall(
    url: URL,
    axiosRequestCallFn: (url: string, requestConfig: AxiosRequestConfig) => Promise<AxiosResponse>,
    queryParams?: unknown, 
    headers?: IHeaders
  ): Promise<IResponse> {

    const appInsightsHeaders = this.appInsightsService.getHeadersForRequest();

    const headersWithCorrelationContext = { ...headers, ...appInsightsHeaders };

    const requestConfig: AxiosRequestConfig = {
      headers: headersWithCorrelationContext,
      params: queryParams
    };

    const timer = new Timer();
    try {

      const response = await axiosRequestCallFn(url.toString(), requestConfig);

      const apiResponse: IResponse = {
        body: response.data,
        status: response.status,
        headers: response.headers
      };

      // App insights metrics
      timer.stop();

      // tslint:disable-next-line: no-unsafe-any
      const dependency = this.createDependencyTelemetry(timer, response.status, true, url, response.config.method);

      this.appInsightsService.trackDependency(
        dependency);
      return apiResponse;

    } catch (error) {

      const e: AxiosError = error as AxiosError;

      // App insights metrics
      timer.stop();
      const resultCode = (e.response && e.response.status) || e.message;
      const dependency = this.createDependencyTelemetry(timer, resultCode, false, url, e.config?.method || "");
      this.appInsightsService.trackDependency(dependency);
      
      const errorMessage = e.response && e.response.data ? JSON.stringify(e.response.data) : e.message;
      
      throw new DownstreamError(errorMessage, {
        body: e.response && e.response.data || {},
        status: e.response ? e.response.status : HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR,
        headers: e.response?.headers ?? {}
      });
    }
  }

  // tslint:disable-next-line: completed-docs
  private createDependencyTelemetry(
    timer: Timer, resultCode: string | number, success: boolean, url: URL, method = ""): IDependencyTelemetry {
    return {
      data: `${method} ${url.toString()}`,
      dependencyTypeName: "HTTP",
      duration: Math.max(timer.duration, 1),
      time: timer.endDate,
      resultCode,
      success,
      name: url.pathname,
      target: url.hostname
    };
  }
}

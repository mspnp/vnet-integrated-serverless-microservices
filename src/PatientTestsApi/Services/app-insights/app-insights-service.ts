import { HttpRequest, TraceContext } from '@azure/functions';
import { TelemetryClient } from 'applicationinsights';
import { CorrelationContext } from 'applicationinsights/out/AutoCollection/CorrelationContextManager';
import { DependencyTelemetry } from 'applicationinsights/out/Declarations/Contracts';
import Traceparent from 'applicationinsights/out/Library/Traceparent';
import { AppInsightsFactory } from './app-insights-factory';
import { AppInsightsHeaders } from './app-insights-headers';
import { CorrelationIdManager } from './correlation-id-manager';
import { CustomPropertiesImpl, PrivateCustomProperties } from './custom-properties-impl';
import { HttpRequestParser } from './http-request-parser';
import { IHeaders } from '../../Models/IHeaders';

// tslint:disable-next-line: completed-docs
export interface IDependencyTelemetry {
  data: string;
  dependencyTypeName: string;
  duration: number;
  time: Date;
  resultCode: string | number;
  success: boolean;
  name: string;
  target: string;
}

export interface IAppInsightsService {
  trackDependency({ data, dependencyTypeName, duration, time, resultCode, success, name, target }: IDependencyTelemetry): void;
  getHeadersForRequest(): IHeaders;
}

/**
 * Service wrapper for Azure App Insights
 */
export class AppInsightsService implements IAppInsightsService {

  private readonly correlationContext: CorrelationContext | null;
  private readonly client?: TelemetryClient;

  constructor(
    private readonly functionContext: TraceContext | undefined,
    request: HttpRequest
    ) {
      try {
        this.client = new AppInsightsFactory().create();
        // tslint:disable-next-line: no-empty
      } catch {
      // if we can't create a client we just leave it blank. Allows developers to work without an app insights instance.
      }
      this.correlationContext = this.initialiseCorrelationContext(request);
  }

  /**
   * Create an initialised App Insights Correlation Context using the inbound request
   * to fetch HTTP headers
   * @param req The inbound HTTP Request
   */
  private initialiseCorrelationContext(req: HttpRequest): CorrelationContext | null {
    // If function context trace exists, preference that before trying
    // to parse headers because otherwise we will generate new traceparent
    // if no header exists which will not match function context trace parent
    if (this.client === undefined) {
      return null;
    }

    const requestParser = new HttpRequestParser(req, this.functionContext);
    
    const operationId = requestParser.getOperationId(this.client.context.tags);
    const parentId = requestParser.getRequestId() || operationId;
    const operationName = requestParser.getOperationName(this.client.context.tags);
    const correlationContextHeader = requestParser.getCorrelationContextHeader();
    const traceparent = requestParser.getTraceparent();
    const tracestate = requestParser.getTracestate();
      
    const context: CorrelationContext = {
      operation: {
        name: operationName || '',
        id: operationId,
        parentId: parentId || '',
        traceparent,
        tracestate
      },
      customProperties: new CustomPropertiesImpl(correlationContextHeader ?? '')
    };
  
  return context;
  }

  /**
   * Tracks a dependency
   */
  public trackDependency({ data, dependencyTypeName, duration, time, resultCode, success, name, target }: IDependencyTelemetry): void {

    if (!this.client) { return; }

    // https://github.com/MicrosoftDocs/azure-docs/pull/52838/files
    // Use this with 'tagOverrides' to correlate custom telemetry to the parent function invocation.
    const tagOverrides: {[key: string]: string} = {};
    if (this.correlationContext) {
      tagOverrides['ai.operation.id'] = this.correlationContext.operation.id;
      tagOverrides['ai.operation.name'] = this.correlationContext.operation.name;
      tagOverrides['ai.operation.parentid'] = this.correlationContext.operation.parentId;
    }

    const dependency: DependencyTelemetry = {
      data,
      dependencyTypeName,
      duration,
      resultCode,
      success,
      contextObjects: this.correlationContext ?? undefined,
      tagOverrides,
      name,
      target,
      time
    };
    this.client.trackDependency(dependency);
  }

  /**
   * Taken from Core App Insights NodeJS SDK
   */
  public getHeadersForRequest(): IHeaders {

    if (!this.correlationContext || !this.correlationContext.operation) { return {}; }
    const currentContext = this.correlationContext;
    const headers: IHeaders = {};

    // TODO: Clean this up a bit

    let uniqueRequestId: string;
    let uniqueTraceparent: string | undefined;
    // tslint:disable-next-line: max-line-length
    if (currentContext.operation.traceparent && Traceparent.isValidTraceId(currentContext.operation.traceparent.traceId)) {
      currentContext.operation.traceparent.updateSpanId();
      uniqueRequestId = currentContext.operation.traceparent.getBackCompatRequestId();
    } else {
      // Start an operation now so that we can include the w3c headers in the outgoing request
      const traceparent = new Traceparent();
      uniqueTraceparent = traceparent.toString();
      uniqueRequestId = traceparent.getBackCompatRequestId();
    }

    headers[AppInsightsHeaders.requestIdHeader] = uniqueRequestId;
    headers[AppInsightsHeaders.parentIdHeader] = currentContext.operation.id;
    headers[AppInsightsHeaders.rootIdHeader] = uniqueRequestId;

    // Set W3C headers, if available
    if (uniqueTraceparent || currentContext.operation.traceparent) {
      headers[AppInsightsHeaders.traceparentHeader] = uniqueTraceparent || currentContext?.operation?.traceparent?.toString() || '';
    } else if (CorrelationIdManager.w3cEnabled) {
      // should never get here since we set uniqueTraceparent above for the w3cEnabled scenario
      const traceparent = new Traceparent().toString();
      headers[AppInsightsHeaders.traceparentHeader] = traceparent;
    }

    if (currentContext?.operation?.tracestate) {
      const tracestate = currentContext.operation.tracestate.toString();
      if (tracestate) {
        headers[AppInsightsHeaders.traceStateHeader] = tracestate;
      }
    }

    if (currentContext?.customProperties) {
      // tslint:disable-next-line: whitespace
      const correlationContextHeader = (<PrivateCustomProperties>currentContext.customProperties).serializeToHeader();
      if (correlationContextHeader) {
        headers[AppInsightsHeaders.correlationContextHeader] = correlationContextHeader;
      }
    }

    return headers;
  }
}

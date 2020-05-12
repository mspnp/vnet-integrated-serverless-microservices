import { HttpRequest, TraceContext } from '@azure/functions';
import { Contracts } from 'applicationinsights';
import Traceparent from 'applicationinsights/out/Library/Traceparent';
import Tracestate from 'applicationinsights/out/Library/Tracestate';
import * as url from 'url';

import { AppInsightsHeaders } from './app-insights-headers';
import { CorrelationIdManager } from './correlation-id-manager';
import { RequestParser } from './request-parser';
import { Util } from './util';
import { IHeaders } from '../../Models/IHeaders';

/** Tag for app insights context */
export interface ITags { [key: string]: string; }

/**
 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
 */
export class HttpRequestParser extends RequestParser {

  private static readonly keys = new Contracts.ContextTagKeys();

  private rawHeaders: IHeaders = {};
  private parentId: string = '';
  private operationId: string = '';
  private requestId: string = '';
  private traceparent: Traceparent = new Traceparent();
  private tracestate: Tracestate | undefined;

  private correlationContextHeader: string | undefined;

  constructor(request: HttpRequest, functionContext?: TraceContext) {
    super();

    if (request) {
      this.method = request.method || '';
      this.url = request.url;
      this.parseHeaders(request, functionContext);
    }
  }

  /**
   * Get a new set of tags for the app insights context using
   * values derived from the request
   * @param tags Existing app insights context tags
   */
  public getRequestTags(tags: ITags): ITags {
    // create a copy of the context for requests since client info will be used here

    const newTags: ITags = {};

    for (const key in tags) {
      newTags[key] = tags[key];
    }

    // don't override tags if they are already set
    newTags[HttpRequestParser.keys.locationIp] = tags[HttpRequestParser.keys.locationIp] || this.getIp() || '';
    newTags[HttpRequestParser.keys.sessionId] = tags[HttpRequestParser.keys.sessionId] || this.getId('ai_session');
    newTags[HttpRequestParser.keys.userId] = tags[HttpRequestParser.keys.userId] || this.getId('ai_user');
    newTags[HttpRequestParser.keys.userAuthUserId] = tags[HttpRequestParser.keys.userAuthUserId] || this.getId('ai_authUser');
    newTags[HttpRequestParser.keys.operationName] = this.getOperationName(tags);
    newTags[HttpRequestParser.keys.operationParentId] = this.getOperationParentId(tags);
    newTags[HttpRequestParser.keys.operationId] = this.getOperationId(tags);

    return newTags;
  }

  /** Returns the Operation ID for the request */
  public getOperationId(tags: ITags): string {
    return tags[HttpRequestParser.keys.operationId] || this.operationId;
  }

  /** Returns the Parent Operation ID for the request */
  public getOperationParentId(tags: ITags): string {
    return tags[HttpRequestParser.keys.operationParentId] || this.parentId || this.getOperationId(tags);
  }

  /** Returns the Operation name of the request */
  public getOperationName(tags: ITags): string {
    // tslint:disable-next-line: prefer-template
    return tags[HttpRequestParser.keys.operationName] || this.method + ' ' + url.parse(this.url).pathname;
  }

  /** Returns the root request id */
  public getRequestId(): string { return this.requestId; }

  /** returns the correlation context value */
  public getCorrelationContextHeader(): string | undefined { return this.correlationContextHeader; }

  /** Returns the trace parent */
  public getTraceparent(): Traceparent { return this.traceparent; }

  /** Returns rthe trace state */
  public getTracestate(): Tracestate | undefined { return this.tracestate; }

  /** Returns the IP Address of the request client */
  private getIp(): string | undefined {

    // regex to match ipv4 without port
    // Note: including the port would cause the payload to be rejected by the data collector
    const ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;

    const check = (str: string): string | undefined => {
      const results = ipMatch.exec(str);
      if (results) {
        return results[0];
      }
    };

    const ip = check(this.rawHeaders['x-forwarded-for'])
      || check(this.rawHeaders['x-client-ip'])
      || check(this.rawHeaders['x-real-ip']);

    return ip;
  }

  /**
   * Get the ID of a header cookie
   * @param name the name of the header cookie
   */
  private getId(name: string): string {
    const cookie = (this.rawHeaders && this.rawHeaders.cookie &&
      typeof this.rawHeaders.cookie === 'string' && this.rawHeaders.cookie) || '';

    const value = this.parseId(Util.getCookie(name, cookie));
    return value;
  }

  /** Extract the ID from the cookie */
  private parseId(cookieValue: string): string {
    const cookieParts = cookieValue.split('|');

    if (cookieParts.length > 0) {
      return cookieParts[0];
    }

    return ''; // old behavior was to return "" for incorrect parsing
  }

  /**
   * Sets this operation's operationId, parentId, requestId (and legacyRootId, if necessary) based on this operation's traceparent
   */
  private setBackCompatFromThisTraceContext(): void {
    // Set operationId
    this.operationId = this.traceparent.traceId;

    // Set parentId with existing spanId
    this.parentId = this.traceparent.parentId;

    // Update the spanId and set the current requestId
    this.traceparent.updateSpanId();
    this.requestId = this.traceparent.getBackCompatRequestId();
  }

  /**
   * Parse the request object and set the trace settings from the headers.
   * Use the function context trace object by default as this will link the function host context
   * to the function worker context
   * @param request The inbound HttpRequest
   * @param functionContext The Azure Function Context
   */
  private parseHeaders(request: HttpRequest, functionContext?: TraceContext): void {

    this.rawHeaders = request.headers;

    if (functionContext && functionContext.traceparent) {
      this.traceparent = new Traceparent(functionContext.traceparent);
      this.tracestate = functionContext.tracestate && new Tracestate(functionContext.tracestate) || undefined;
      this.setBackCompatFromThisTraceContext();
      return;
    }

    if (!request.headers) { return; }

    const tracestateHeader = request.headers[AppInsightsHeaders.traceStateHeader]; // w3c header
    const traceparentHeader = request.headers[AppInsightsHeaders.traceparentHeader]; // w3c header
    const requestIdHeader = request.headers[AppInsightsHeaders.requestIdHeader]; // default AI header
    const legacyParentId = request.headers[AppInsightsHeaders.parentIdHeader]; // legacy AI header
    const legacyRootId = request.headers[AppInsightsHeaders.rootIdHeader]; // legacy AI header

    this.correlationContextHeader = request.headers[AppInsightsHeaders.correlationContextHeader];

    if (CorrelationIdManager.w3cEnabled && (traceparentHeader || tracestateHeader)) {
      // Parse W3C Trace Context headers
      this.traceparent = new Traceparent(traceparentHeader);
      this.tracestate = traceparentHeader && tracestateHeader && new Tracestate(tracestateHeader) || undefined;
      this.setBackCompatFromThisTraceContext();
      return;
    }

    if (requestIdHeader) {
      // Parse AI headers
      if (CorrelationIdManager.w3cEnabled) {
        this.traceparent = new Traceparent(undefined, requestIdHeader);
        this.setBackCompatFromThisTraceContext();
      } else {
        this.parentId = requestIdHeader;
        this.requestId = CorrelationIdManager.generateRequestId(this.parentId);
        this.operationId = CorrelationIdManager.getRootId(this.requestId);
      }

      return;
    }

    // Legacy fallback
    if (CorrelationIdManager.w3cEnabled) {
      this.traceparent = new Traceparent();
      this.traceparent.parentId = legacyParentId;
      this.traceparent.legacyRootId = legacyRootId || legacyParentId;
      this.setBackCompatFromThisTraceContext();
    } else {
      this.parentId = legacyParentId;
      this.requestId = CorrelationIdManager.generateRequestId(legacyRootId || this.parentId);
      this.correlationContextHeader = undefined;
      this.operationId = CorrelationIdManager.getRootId(this.requestId);
    }
  }
}

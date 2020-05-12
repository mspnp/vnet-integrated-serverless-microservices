import * as AppInsights from 'applicationinsights';
import { TelemetryClient } from 'applicationinsights';

/**
 * Factory class for creating an App Insights client instance
 */
export class AppInsightsFactory {
  private static client: TelemetryClient;
  /**
   * Create and\or return a singleton instance of the App Insights client
   */
  public create(): TelemetryClient {
    if (!AppInsightsFactory.client) {
      AppInsightsFactory.client = new AppInsights.TelemetryClient();
    }
    return AppInsightsFactory.client;
  }
}

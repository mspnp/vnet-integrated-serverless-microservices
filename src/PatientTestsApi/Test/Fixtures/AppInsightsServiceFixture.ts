import { IHeaders } from "../../Models/IHeaders";
import { AppInsightsService } from "../../Services/app-insights/app-insights-service";
import { mock, when } from "ts-mockito";

export class AppInsightsFixture {
  public createAppInsightsMock(expectedHeaders?: IHeaders): AppInsightsService {

    const appInsightsMock = mock<AppInsightsService>();
  
    if (expectedHeaders) {
      when(appInsightsMock.getHeadersForRequest()).thenReturn(expectedHeaders);
    }
    return appInsightsMock;
  }
}
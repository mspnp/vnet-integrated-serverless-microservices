import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { ControllerFactory } from "../Controllers/ControllerFactory";


const controllerFactory = new ControllerFactory();

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {  
  const controller = await controllerFactory.createAuditController(context.traceContext, req);
  context.res = await controller.createAuditRecord(req);
};

export default httpTrigger;
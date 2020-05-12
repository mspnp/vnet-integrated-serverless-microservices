import Joi from "@hapi/joi";

export interface IAuditRecord {
  [key: string]: unknown;
  id?: string;
  createdDate?: Date;
  sourceSystemName: string;
  resource: {
    type: string;
    id: string;
    operation: string;
  };
}

export const AuditRecordSchema = Joi.object<IAuditRecord>({
  id: Joi.string().optional(),
  createdDate: Joi.date().optional(),
  sourceSystemName: Joi.string().required(),
  resource: Joi.object({
    type: Joi.string().required(),
    id: Joi.string().optional().optional(),
    operation: Joi.string().required(),
  })
});

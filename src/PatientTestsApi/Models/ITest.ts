import Joi from "@hapi/joi";

export interface ITest {
  [key: string]: unknown;
  id?: string;
  patientId: string;
  performer: string;
  orderReference: string;
  observations: IObservation[];
  lastUpdated?: Date;
}

export interface IObservation {
  id: string;
  code: string;
  measurement: string;
  interpretation: string;
  issued: Date;
  status: string;
}

export const TestSchema = Joi.object<ITest>({
  id: Joi.string().guid().optional(),
  patientId: Joi.string().guid().required(),
  performer: Joi.string().required(),
  orderReference: Joi.string().required(),
  observations: Joi.array().items(
    Joi.object<IObservation>({
      id: Joi.string().required(),
      code: Joi.string().required(),
      measurement: Joi.string().required(),
      interpretation: Joi.string().required(),
      issued: Joi.date().required(),
      status: Joi.string().required(),
    })
  ).required(),
  lastUpdated: Joi.date().optional()
});
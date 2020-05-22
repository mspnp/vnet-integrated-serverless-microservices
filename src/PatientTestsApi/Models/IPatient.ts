import { Gender } from "./Gender";
import Joi from "@hapi/joi";

export interface IPatient {
  [key: string]: unknown;
  id?: string;
  firstName?: string;
  lastName: string;
  fullName?: string;
  gender: Gender;
  dateOfBirth: string;
  postCode: string;
  insuranceNumber?: string;
  preferredContactNumber?: string;
  lastUpdated?: Date;
}

export interface IPatientSearch {
  [key: string]: unknown;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: Gender;
  dateOfBirthFrom?: Date;
  dateOfBirthTo?: Date;
  postCode?: string;
  insuranceNumber?: string;
  preferredContactNumber?: string;
}

const maxLengthNameField = 64;
const maxLengthFullNameField = 128;
const postcodeLength = 4;

const dateRegexString = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/;

export const PatientSchema = Joi.object<IPatient>({
  id: Joi.string().guid().optional(),
  firstName: Joi.string().max(maxLengthNameField).required(),
  lastName: Joi.string().max(maxLengthNameField),
  fullName: Joi.string().max(maxLengthFullNameField),

  gender: Joi.string()
    .allow(Gender.Male, Gender.Female, Gender.Other, Gender.Unknown)
    .only()
    .required(),

  dateOfBirth: Joi.string().pattern(dateRegexString, "date").required(),
  postCode: Joi.string().length(postcodeLength).required(),
  insuranceNumber: Joi.string(),
  preferredContactNumber: Joi.string(),
  lastUpdated: Joi.date().optional(),
});

export const PatientSearchSchema = Joi.object<IPatientSearch>({
  id: Joi.string().guid(),
  firstName: Joi.string().max(maxLengthNameField),
  lastName: Joi.string().max(maxLengthNameField),
  fullName: Joi.string().max(maxLengthFullNameField),

  gender: Joi.string()
    .allow(Gender.Male, Gender.Female, Gender.Other, Gender.Unknown)
    .only(),

  dateOfBirthFrom: Joi.date(),
  dateOfBirthTo: Joi.date(),
  postCode: Joi.string().length(postcodeLength),
  insuranceNumber: Joi.string(),
  preferredContactNumber: Joi.string(),
});
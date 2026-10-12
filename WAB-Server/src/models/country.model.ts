import { Schema, model } from 'mongoose';
import {
  COUNTRY_CODE_PATTERN,
  DIAL_CODE_PATTERN,
  type LocalizedName,
} from '../constants/referenceData';
import { localizedNameSchema } from './localizedName';

/** BUSINESS_DOMAIN.md §3.2. `phoneRegex` is tested against the national number. */
export interface CountryRaw {
  code: string;
  name: LocalizedName;
  dialCode: string;
  flagKey: string;
  phoneRegex: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const compiles = (pattern: string): boolean => {
  try {
    return new RegExp(pattern) instanceof RegExp;
  } catch {
    return false;
  }
};

const countrySchema = new Schema<CountryRaw>(
  {
    code: { type: String, required: true, unique: true, match: COUNTRY_CODE_PATTERN },
    name: { type: localizedNameSchema, required: true },
    dialCode: { type: String, required: true, match: DIAL_CODE_PATTERN },
    flagKey: { type: String, required: true },
    phoneRegex: { type: String, required: true, validate: { validator: compiles } },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CountryModel = model<CountryRaw>('Country', countrySchema);

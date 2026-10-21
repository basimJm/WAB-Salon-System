import { JORDAN_CODE } from '../../constants/referenceData';
import { DEFAULT_TIMEZONE } from '../../constants/time';
import { AdminModel } from '../../models/admin.model';
import { AreaModel } from '../../models/area.model';
import { CatalogServiceModel } from '../../models/catalogService.model';
import { CityModel } from '../../models/city.model';
import { CountryModel } from '../../models/country.model';
import { SettingModel } from '../../models/setting.model';
import type { DemoContext } from './types';

/** The city every demo salon and customer lives in (its areas come from the reference seed). */
export const DEMO_CITY = 'Amman';
const TIMEZONE_SETTING = 'timezone';

/**
 * Reads what the demo data hangs on: the admin, Jordan, Amman and its areas, the catalog and the
 * time zone. Fails with the command to run when a prerequisite is missing.
 */
export const loadDemoContext = async (now: Date = new Date()): Promise<DemoContext> => {
  const admin = await AdminModel.findOne({}, { _id: 1 }).sort({ createdAt: 1 }).lean();
  if (admin === null) throw new Error('no admin yet: run `npm run seed:admin` first');
  const country = await CountryModel.findOne({ code: JORDAN_CODE }).lean();
  const city = await CityModel.findOne({ countryCode: JORDAN_CODE, 'name.en': DEMO_CITY }).lean();
  if (country === null || city === null)
    throw new Error('reference data missing: run `npm run seed` first');
  const areas = await AreaModel.find({ cityId: city._id }).lean();
  const catalog = await CatalogServiceModel.find({ active: true }).lean();
  const timezone = await SettingModel.findOne({ key: TIMEZONE_SETTING }).lean();
  return {
    now,
    timeZone: typeof timezone?.value === 'string' ? timezone.value : DEFAULT_TIMEZONE,
    adminId: admin._id,
    countryCode: country.code,
    dialCode: country.dialCode,
    cityId: city._id,
    areaIds: new Map(areas.map((area) => [area.name.en, area._id])),
    catalog: catalog.map((entry) => ({
      id: entry._id,
      gender: entry.gender,
      name: entry.name,
      imageKey: entry.imageKey,
    })),
  };
};

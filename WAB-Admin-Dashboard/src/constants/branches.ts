/** Opens a coordinate pair in the visitor's map app (new tab), so an admin can check a branch location. */
export const MAP_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
export const COORDINATE_DECIMALS = 6;
/** Setting that caps the number of non-closed branches per salon (BUSINESS_DOMAIN §10). */
export const MAX_BRANCHES_SETTING = 'salon.maxBranches';
/** Query keys (first element = operation id, so realtime invalidations match). */
export const BRANCHES_QUERY = 'getSalonsByIdBranches';
export const MEMBERS_QUERY = 'getSalonsByIdMembers';

export const mapLinkOf = (latitude: number, longitude: number): string =>
  `${MAP_SEARCH_URL}${String(latitude)},${String(longitude)}`;

import core from './ar/core.json';
import login from './ar/login.json';
import filters from './ar/filters.json';
import errors from './ar/errors.json';
import designKits from './ar/designKits.json';
import design from './ar/design.json';
import forms from './ar/forms.json';
import status from './ar/status.json';

/** Every area file of this language, merged. A new area = a new file here and in the other language. */
const ar = {
  ...core,
  ...login,
  ...errors,
  ...filters,
  ...design,
  ...designKits,
  ...forms,
  ...status,
};

export default ar;

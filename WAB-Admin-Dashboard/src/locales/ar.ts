import core from './ar/core.json';
import login from './ar/login.json';
import errors from './ar/errors.json';
import design from './ar/design.json';
import forms from './ar/forms.json';
import status from './ar/status.json';

/** Every area file of this language, merged. A new area = a new file here and in the other language. */
const ar = { ...core, ...login, ...errors, ...design, ...forms, ...status };

export default ar;

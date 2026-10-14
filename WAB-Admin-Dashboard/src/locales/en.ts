import core from './en/core.json';
import login from './en/login.json';
import filters from './en/filters.json';
import errors from './en/errors.json';
import design from './en/design.json';
import forms from './en/forms.json';
import status from './en/status.json';

/** Every area file of this language, merged. A new area = a new file here and in the other language. */
const en = { ...core, ...login, ...errors, ...filters, ...design, ...forms, ...status };

export default en;

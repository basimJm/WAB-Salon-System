import { parseServiceAccount } from '../src/config/serviceAccount';
import { ERROR_CODES } from '../src/constants/codes';
import { FAKE_ACCOUNT } from './helpers';

describe('parseServiceAccount', () => {
  it('accepts an object or JSON text and keeps extra fields', () => {
    const extended = { ...FAKE_ACCOUNT, client_id: '1' };
    expect(parseServiceAccount(extended)).toBe(extended);
    expect(parseServiceAccount(JSON.stringify(FAKE_ACCOUNT)).project_id).toBe('wab-test');
  });

  it('rejects invalid JSON without echoing it', () => {
    try {
      parseServiceAccount('{ private_key: oops');
      throw new Error('should not reach');
    } catch (error) {
      expect(error).toMatchObject({
        code: ERROR_CODES.CONFIG_INVALID,
        message: 'service account is not valid JSON',
      });
      expect(String(error)).not.toContain('oops');
    }
  });

  it('names the missing or invalid fields only', () => {
    try {
      parseServiceAccount({
        type: 'service_account',
        project_id: '',
        client_email: 'nope',
        private_key: 'SECRET-VALUE',
      });
      throw new Error('should not reach');
    } catch (error) {
      const failure = error as { details: { fields: string[] }; message: string };
      expect(failure.details.fields).toEqual(['project_id', 'client_email']);
      expect(JSON.stringify(failure)).not.toContain('SECRET-VALUE');
    }
  });

  it('rejects a key of the wrong type and non-objects', () => {
    expect(() => parseServiceAccount({ ...FAKE_ACCOUNT, type: 'authorized_user' })).toThrow(
      'service account is invalid',
    );
    expect(() => parseServiceAccount('null')).toThrow('service account is invalid');
    expect(() => parseServiceAccount('[]')).toThrow('service account is invalid');
  });
});

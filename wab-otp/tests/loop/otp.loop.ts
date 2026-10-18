import { SDK_NAME } from '../../src';

describe('otp loop', () => {
  it('loads the package entry point', () => {
    expect(SDK_NAME).toBe('wab-otp');
  });
});

import { PACKAGE_NAME } from '../src';

describe('scaffold', () => {
  it('exposes the package name', () => {
    expect(PACKAGE_NAME).toBe('@wab/analytics');
  });
});

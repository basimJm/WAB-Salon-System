import { PACKAGE_NAME } from '../src';

describe('package scaffold', () => {
  it('exposes its published name', () => {
    expect(PACKAGE_NAME).toBe('@wab/payments');
  });
});

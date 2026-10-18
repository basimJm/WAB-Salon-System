import { PACKAGE_NAME } from '../../src';

describe('loop (scaffold)', () => {
  it('is stable over repeated runs', () => {
    for (let i = 0; i < 50; i += 1) expect(PACKAGE_NAME).toBe('@wab/analytics');
  });
});

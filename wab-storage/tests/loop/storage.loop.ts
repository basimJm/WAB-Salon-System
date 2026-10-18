import { SDK_NAME } from '../../src';

describe('storage loop (placeholder until STO-009)', () => {
  it('loads the package entry point', () => {
    expect(SDK_NAME).toBe('wab-storage');
  });
});

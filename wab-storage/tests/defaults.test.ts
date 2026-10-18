import { SDK_NAME } from '../src';

describe('scaffold', () => {
  it('exports the SDK name', () => {
    expect(SDK_NAME).toBe('wab-storage');
  });
});

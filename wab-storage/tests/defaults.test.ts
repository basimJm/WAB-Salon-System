import * as sdk from '../src';

describe('public entry point', () => {
  it('exports the SDK name and the public symbols', () => {
    expect(sdk.SDK_NAME).toBe('wab-storage');
    for (const value of Object.values(sdk)) expect(value).toBeDefined();
  });
});

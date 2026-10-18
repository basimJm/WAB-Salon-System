import * as api from '../src';

describe('public api', () => {
  it('exposes every export defined', () => {
    expect(api.PACKAGE_NAME).toBe('@wab/analytics');
    const values: unknown[] = Object.values(api);
    expect(values.length).toBeGreaterThan(0);
    expect(values.filter((value) => value === undefined)).toEqual([]);
  });
});

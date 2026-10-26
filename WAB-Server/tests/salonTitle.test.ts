import { salonTitle } from '../src/domain/branches/salonTitle';

describe('salonTitle (§5.17, SRV-172)', () => {
  it('names every branch of a multi-branch salon, the main one included', () => {
    expect(salonTitle('Hifa', 'Mecca Street', 2)).toBe('Hifa - Mecca Street');
    expect(salonTitle('هيفا', 'عبدون', 4)).toBe('هيفا - عبدون');
  });
  it('a single-branch salon or an unknown branch is the salon name alone', () => {
    expect(salonTitle('Hifa', 'Mecca Street', 1)).toBe('Hifa');
    expect(salonTitle('Hifa', 'Mecca Street', 0)).toBe('Hifa');
    expect(salonTitle('Hifa', undefined, 3)).toBe('Hifa');
    expect(salonTitle('Hifa', '', 3)).toBe('Hifa');
  });
});

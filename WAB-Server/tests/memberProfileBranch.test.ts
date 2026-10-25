import { toMemberProfile } from '../src/domain/auth/merchantAuth.service';

const base = {
  id: 'm1',
  salonId: 's1',
  firstName: 'Lina',
  lastName: 'H',
  phone: '+962790000001',
  permissions: [],
  providesServices: true,
  active: true,
} as const;

describe('member profile branch scope (SRV-149)', () => {
  it('a branch member carries their branch; the owner none (every branch)', () => {
    expect(toMemberProfile({ ...base, role: 'MANAGER', branchId: 'b1' } as never).branchId).toBe(
      'b1',
    );
    expect(
      toMemberProfile({ ...base, role: 'OWNER', branchId: 'b1' } as never).branchId,
    ).toBeNull();
    expect(toMemberProfile({ ...base, role: 'EMPLOYEE' } as never).branchId).toBeNull();
  });
});

import { seedAdmin } from '../src/seeds/admin';
import { AdminsRepository } from '../src/repositories/identity.repository';
import { verifyPassword } from '../src/utils/auth/password';
import { createFakeModel } from './helpers/fakeModel';

const PASSWORD = 'x'.repeat(14);
const rig = (): { fake: ReturnType<typeof createFakeModel>; admins: AdminsRepository } => {
  const fake = createFakeModel();
  return { fake, admins: new AdminsRepository(fake.model as never) };
};
const cheap = (plain: string): Promise<string> => Promise.resolve(`hash:${plain}`);

describe('seedAdmin', () => {
  it('creates the admin with a lower-cased email and a hashed password', async () => {
    const { fake, admins } = rig();
    const out = await seedAdmin({
      admins,
      email: ' Boss@Example.COM ',
      password: PASSWORD,
      hash: cheap,
    });
    expect(out.email).toBe('boss@example.com');
    expect(fake.docs).toHaveLength(1);
    expect(JSON.stringify(fake.docs[0])).not.toContain(`"${PASSWORD}"`);
    expect(fake.docs[0]?.['passwordHash']).toBe(`hash:${PASSWORD}`);
  });

  it('stores a real bcrypt hash by default', async () => {
    const { fake, admins } = rig();
    await seedAdmin({ admins, email: 'a@b.co', password: PASSWORD });
    expect(await verifyPassword(PASSWORD, String(fake.docs[0]?.['passwordHash']))).toBe(true);
  });

  it('refuses when an admin already exists and leaves it untouched', async () => {
    const { fake, admins } = rig();
    await seedAdmin({ admins, email: 'a@b.co', password: PASSWORD, hash: cheap });
    await expect(
      seedAdmin({ admins, email: 'c@d.co', password: PASSWORD, hash: cheap }),
    ).rejects.toThrow('already exists');
    expect(fake.docs).toHaveLength(1);
  });

  it.each([
    ['not-an-email', PASSWORD],
    ['', PASSWORD],
    ['a@b.co', 'short'],
    ['a@b.co', ''],
  ])('rejects %j / %j and writes nothing', async (email, password) => {
    const { fake, admins } = rig();
    await expect(seedAdmin({ admins, email, password, hash: cheap })).rejects.toThrow();
    expect(fake.docs).toHaveLength(0);
  });
});

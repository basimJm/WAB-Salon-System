import express from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { PERMISSIONS, type Permission } from '../src/constants/enums';
import { OWNER_ONLY_CAPABILITIES, ROLE_TEMPLATES } from '../src/constants/permissions';
import {
  defaultPermissionsFor,
  effectivePermissions,
  hasAllPermissions,
  hasAnyPermission,
  normalizeGrant,
} from '../src/domain/permissions/permissions';
import { requireAuth } from '../src/middlewares/auth';
import { errorHandler } from '../src/middlewares/errorHandler';
import { language } from '../src/middlewares/language';
import { loadMember, requireOwner, requirePermission } from '../src/middlewares/permission';
import { requestId } from '../src/middlewares/requestId';
import { MembersRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);

describe('role templates', () => {
  it('has 15 permission keys and no owner-only capability among them', () => {
    expect(PERMISSIONS).toHaveLength(15);
    for (const capability of OWNER_ONLY_CAPABILITIES) {
      expect(PERMISSIONS as readonly string[]).not.toContain(capability);
    }
  });

  it('MANAGER gets everything but FINANCE_VIEW and POLICIES_MANAGE; EMPLOYEE only the two basics', () => {
    expect(ROLE_TEMPLATES.MANAGER).toHaveLength(13);
    expect(ROLE_TEMPLATES.MANAGER).not.toContain('FINANCE_VIEW');
    expect(ROLE_TEMPLATES.MANAGER).not.toContain('POLICIES_MANAGE');
    expect(ROLE_TEMPLATES.EMPLOYEE).toEqual(['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW']);
    expect(defaultPermissionsFor('OWNER')).toEqual([]);
    expect(defaultPermissionsFor('EMPLOYEE')).toEqual(['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW']);
  });

  it('hands out copies, so callers cannot change the template', () => {
    defaultPermissionsFor('MANAGER').pop();
    expect(ROLE_TEMPLATES.MANAGER).toHaveLength(13);
  });
});

describe('permission checks', () => {
  const employee = { role: 'EMPLOYEE', permissions: ['REVIEWS_VIEW'] } as const;

  it('the owner has everything whatever is stored', () => {
    const owner = { role: 'OWNER', permissions: [] } as const;
    expect(effectivePermissions(owner)).toEqual(PERMISSIONS);
    expect(hasAllPermissions(owner, ['FINANCE_VIEW', 'POLICIES_MANAGE'])).toBe(true);
  });

  it('all / any over a granted list', () => {
    expect(hasAllPermissions(employee, ['REVIEWS_VIEW'])).toBe(true);
    expect(hasAllPermissions(employee, ['REVIEWS_VIEW', 'FINANCE_VIEW'])).toBe(false);
    expect(hasAnyPermission(employee, ['FINANCE_VIEW', 'REVIEWS_VIEW'])).toBe(true);
    expect(hasAnyPermission(employee, ['FINANCE_VIEW'])).toBe(false);
    expect(hasAnyPermission(employee, [])).toBe(false);
    expect(hasAllPermissions(employee, [])).toBe(true);
  });
});

describe('normalizeGrant', () => {
  it('keeps known keys once, in canonical order', () => {
    expect(normalizeGrant(['REVIEWS_VIEW', 'DASHBOARD_VIEW', 'REVIEWS_VIEW'])).toEqual([
      'DASHBOARD_VIEW',
      'REVIEWS_VIEW',
    ]);
    expect(normalizeGrant([])).toEqual([]);
  });

  it.each(['TEAM_MANAGE', 'PAYOUT_DETAILS_MANAGE', 'SALON_DELETION'])(
    'refuses the owner-only capability %s (never grantable)',
    (key) => {
      expect(() => normalizeGrant([key])).toThrow(
        expect.objectContaining({
          httpStatus: 400,
          details: [expect.objectContaining({ code: 'OWNER_REQUIRED' }) as unknown],
        }) as Error,
      );
    },
  );

  it('refuses unknown keys, naming the field', () => {
    expect(() => normalizeGrant(['NOPE'], 'body.p')).toThrow(
      expect.objectContaining({
        details: [
          expect.objectContaining({ field: 'body.p', code: 'VALIDATION_ERROR' }) as unknown,
        ],
      }) as Error,
    );
  });
});

describe('enforcement middleware', () => {
  const members = createFakeModel();
  const salonId = new Types.ObjectId();
  const add = (
    role: string,
    permissions: Permission[],
    over: Record<string, unknown> = {},
  ): string => {
    const _id = new Types.ObjectId();
    members.docs.push({ _id, salonId, role, permissions, active: true, ...over });
    return _id.toHexString();
  };
  const token = (id: string, type: 'MEMBER' | 'CUSTOMER' = 'MEMBER'): string =>
    signAccessToken({ secret: SECRET, subjectType: type, subjectId: id, ttlSec: 600 }).token;

  const app = express();
  app.use(requestId(logger), language);
  const guard = [
    requireAuth('merchant', SECRET),
    loadMember(new MembersRepository(members.model as never)),
  ];
  app.get('/finance', ...guard, requirePermission(['FINANCE_VIEW']), (req, res) => {
    res.json({ salonId: req.member?.salonId });
  });
  app.get(
    '/bookings',
    ...guard,
    requirePermission(['BOOKINGS_VIEW_ALL', 'BOOKINGS_VIEW_OWN'], 'any'),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  app.get('/team', ...guard, requireOwner, (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/no-load', requirePermission(['FINANCE_VIEW']), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler(logger));

  const get = async (path: string, id?: string): Promise<{ status: number; body: unknown }> =>
    await request(app)
      .get(path)
      .set(id === undefined ? {} : { Authorization: `Bearer ${token(id)}` });
  const code = (res: { body: unknown }): string =>
    (res.body as { error: { code: string } }).error.code;

  beforeEach(() => {
    members.docs.length = 0;
  });

  it('lets the owner through everywhere', async () => {
    const owner = add('OWNER', []);
    expect((await get('/finance', owner)).status).toBe(200);
    expect((await get('/team', owner)).status).toBe(200);
  });

  it('checks the stored permissions on every request, so a change applies at once', async () => {
    const id = add('MANAGER', ['BOOKINGS_VIEW_OWN']);
    const denied = await get('/finance', id);
    expect(denied.status).toBe(403);
    expect(code(denied)).toBe('PERMISSION_DENIED');
    Object.assign(members.docs[0] ?? {}, { permissions: ['FINANCE_VIEW'] });
    expect((await get('/finance', id)).status).toBe(200);
    Object.assign(members.docs[0] ?? {}, { permissions: [] });
    expect((await get('/finance', id)).status).toBe(403);
  });

  it('supports any-of permissions', async () => {
    expect((await get('/bookings', add('EMPLOYEE', ['BOOKINGS_VIEW_OWN']))).status).toBe(200);
    expect((await get('/bookings', add('EMPLOYEE', ['REVIEWS_VIEW']))).status).toBe(403);
  });

  it('keeps owner-only routes closed to managers, whatever they were granted', async () => {
    const manager = add('MANAGER', [...PERMISSIONS]);
    const res = await get('/team', manager);
    expect(res.status).toBe(403);
    expect(code(res)).toBe('OWNER_REQUIRED');
  });

  it('rejects deactivated and removed members, other scopes and missing tokens', async () => {
    const off = await get('/finance', add('OWNER', [], { active: false }));
    expect(off.status).toBe(403);
    expect(code(off)).toBe('MEMBER_INACTIVE');
    expect((await get('/finance', new Types.ObjectId().toHexString())).status).toBe(401);
    expect((await get('/finance')).status).toBe(401);
    const wrongScope = await request(app)
      .get('/finance')
      .set('Authorization', `Bearer ${token(add('OWNER', []), 'CUSTOMER')}`);
    expect(wrongScope.status).toBe(403);
  });

  it('a permission check without loadMember is a 401, never an open door', async () => {
    expect((await request(app).get('/no-load')).status).toBe(401);
  });
});

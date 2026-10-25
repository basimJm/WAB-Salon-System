import type { Request, Router } from 'express';
import type { UploadActor } from '../../../domain/uploads/uploads.service';
import { unavailableGuard, unavailableUploads, type ApiServices } from '../../services';
import { createUploadRouteLimiter } from '../rateLimits';
import { createUploadsRouter } from './uploads.routes';

const subject = (req: Request): string => req.auth?.subjectId ?? '';

export const createCustomerUploadsRouter = (services: ApiServices): Router =>
  createUploadsRouter({
    service: services.uploads ?? unavailableUploads,
    guard: [services.installations?.customerRequired ?? unavailableGuard],
    actorOf: (req): UploadActor => ({
      scope: 'customer',
      ownerType: 'CUSTOMER',
      ownerId: subject(req),
    }),
    limiter: createUploadRouteLimiter(services, 'customer'),
  });

export const createMerchantUploadsRouter = (services: ApiServices): Router =>
  createUploadsRouter({
    service: services.uploads ?? unavailableUploads,
    guard: services.salonProfile?.guard ?? [unavailableGuard],
    actorOf: (req): UploadActor => ({
      scope: 'merchant',
      ownerType: 'MEMBER',
      ownerId: req.member?.id ?? '',
      salonId: req.member?.salonId,
      role: req.member?.role,
      permissions: req.member?.permissions,
    }),
    limiter: createUploadRouteLimiter(services, 'merchant'),
    guestLicense: true,
  });

export const createAdminUploadsRouter = (services: ApiServices): Router =>
  createUploadsRouter({
    service: services.uploads ?? unavailableUploads,
    guard: [services.adminGuard ?? unavailableGuard],
    actorOf: (req): UploadActor => ({ scope: 'admin', ownerType: 'ADMIN', ownerId: subject(req) }),
    limiter: createUploadRouteLimiter(services, 'admin'),
  });

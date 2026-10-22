import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ProfileRepository } from '@/domain/profile/profile';

const O = OPERATIONS;
const get = defineEndpoint(O.getProfile, { data: dto.getProfileDataSchema });
const patch = defineEndpoint(O.patchProfile, {
  data: dto.patchProfileDataSchema,
  body: dto.patchProfileBodySchema,
});
const password = defineEndpoint(O.postProfilePassword, {
  data: dto.postProfilePasswordDataSchema,
  body: dto.postProfilePasswordBodySchema,
});
const request = defineEndpoint(O.postProfileEmailRequest, {
  data: dto.postProfileEmailRequestDataSchema,
  body: dto.postProfileEmailRequestBodySchema,
});
const verify = defineEndpoint(O.postProfileEmailVerify, {
  data: dto.postProfileEmailVerifyDataSchema,
  body: dto.postProfileEmailVerifyBodySchema,
});

export class RemoteProfileRepository implements ProfileRepository {
  constructor(private readonly api: ApiClient) {}

  get: ProfileRepository['get'] = async () => (await this.api.execute(get)).data;

  saveAlertEmails: ProfileRepository['saveAlertEmails'] = async (emails) =>
    (await this.api.execute(patch, { body: { alertEmails: [...emails] } })).data;

  changePassword: ProfileRepository['changePassword'] = async (currentPassword, newPassword) => {
    await this.api.execute(password, { body: { currentPassword, newPassword } });
  };

  requestEmailChange: ProfileRepository['requestEmailChange'] = async (newEmail, pw) =>
    (await this.api.execute(request, { body: { newEmail, password: pw } })).data;

  verifyEmailChange: ProfileRepository['verifyEmailChange'] = async (code) =>
    (await this.api.execute(verify, { body: { code } })).data;
}

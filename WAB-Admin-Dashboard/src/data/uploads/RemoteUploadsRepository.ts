import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { UploadedFile, UploadPurpose, UploadsRepository } from '@/domain/uploads/uploads';
import type { PutFile } from './putFile';

const presign = defineEndpoint(OPERATIONS.postUploadsPresign, {
  data: dto.postUploadsPresignDataSchema,
  body: dto.postUploadsPresignBodySchema,
});
const confirm = defineEndpoint(OPERATIONS.postUploadsConfirm, {
  data: dto.postUploadsConfirmDataSchema,
  body: dto.postUploadsConfirmBodySchema,
});

export class RemoteUploadsRepository implements UploadsRepository {
  constructor(
    private readonly api: ApiClient,
    private readonly put: PutFile,
  ) {}

  async upload(
    purpose: UploadPurpose,
    file: File,
    onProgress: (ratio: number) => void,
  ): Promise<UploadedFile> {
    const { data: ticket } = await this.api.execute(presign, {
      body: { purpose, contentType: file.type, size: file.size },
    });
    await this.put(ticket.upload, file, onProgress);
    const { data } = await this.api.execute(confirm, { body: { key: ticket.key } });
    return { key: data.key, url: data.url };
  }
}

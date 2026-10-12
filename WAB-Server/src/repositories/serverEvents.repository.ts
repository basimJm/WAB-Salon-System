import type { Model } from 'mongoose';
import { ServerEventModel, type ServerEventRaw } from '../models/serverEvent.model';
import { AppendOnlyRepository } from './appendOnly.repository';

export class ServerEventsRepository extends AppendOnlyRepository<ServerEventRaw> {
  constructor(model: Model<ServerEventRaw> = ServerEventModel) {
    super(model);
  }
}

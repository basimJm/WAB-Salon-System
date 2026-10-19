import { validationError } from '../errors';
import { assertActor } from '../event';
import { assertRange } from '../range';
import type { ActorRef, JourneyItem, JourneyPage } from '../types';
import type { QueryContext } from './context';

/** Name of the crash entries in a journey. */
export const CRASH_ITEM_NAME = 'app.crash';

interface Raw {
  readonly at: number;
  readonly item: Omit<JourneyItem, 'sessionId'>;
}

const pageOf = (page: JourneyPage | undefined, max: number): { limit: number; offset: number } => {
  const limit = page?.limit ?? max;
  const offset = page?.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw validationError('limit is out of range', { max });
  }
  if (!Number.isInteger(offset) || offset < 0) throw validationError('offset must be 0 or more');
  return { limit, offset };
};

/** App installations of the actor: every link, so guest history joins the account. */
const installationsOf = async (context: QueryContext, actor: ActorRef): Promise<string[]> => {
  const links = await context.identity.linksOfActor(actor);
  return [...new Set(links.map((link) => link.installationId))];
};

/**
 * Timeline of one actor: server events, and (with a warehouse) app events and crashes of every
 * linked installation, ordered by time and grouped into sessions by inactivity gaps.
 */
export const journey = async (
  actor: ActorRef,
  range: { from: Date; to: Date },
  page: JourneyPage | undefined,
  context: QueryContext,
): Promise<JourneyItem[]> => {
  const { options, warehouse } = context;
  assertRange(range, options.limits.maxRangeDays);
  assertActor(actor, options);
  const { limit, offset } = pageOf(page, options.limits.maxJourneyItems);
  const wanted = offset + limit;
  const raws: Raw[] = [];
  const server = await context.events.find({
    ...range,
    actors: [actor],
    limit: wanted,
    order: 'asc',
  });
  for (const event of server) {
    raws.push({
      at: event.ts.getTime(),
      item: {
        ts: event.ts.toISOString(),
        source: 'SERVER',
        name: event.name,
        params: event.params,
      },
    });
  }
  if (warehouse !== undefined) {
    const installationIds = await installationsOf(context, actor);
    const query = { ...range, installationIds, userIds: [actor.actorId], limit: wanted };
    const [apps, crashes] = await Promise.all([
      warehouse.findAppEvents(query),
      warehouse.findCrashes(query),
    ]);
    for (const app of apps) {
      raws.push({
        at: app.ts.getTime(),
        item: {
          ts: app.ts.toISOString(),
          source: 'APP',
          name: app.name,
          ...(app.screen === undefined ? {} : { screen: app.screen }),
          params: app.params,
        },
      });
    }
    for (const crash of crashes) {
      raws.push({
        at: crash.ts.getTime(),
        item: {
          ts: crash.ts.toISOString(),
          source: 'CRASH',
          name: CRASH_ITEM_NAME,
          params: {
            issueId: crash.issueId,
            ...(crash.title === undefined ? {} : { title: crash.title }),
            ...(crash.appVersion === undefined ? {} : { appVersion: crash.appVersion }),
          },
        },
      });
    }
  }
  raws.sort((a, b) => a.at - b.at);
  let session = 0;
  let last: number | undefined;
  const items = raws.map((raw): JourneyItem => {
    if (last === undefined || raw.at - last > options.sessionGapMs) session += 1;
    last = raw.at;
    return { ...raw.item, sessionId: `s${String(session)}` };
  });
  return items.slice(offset, wanted);
};

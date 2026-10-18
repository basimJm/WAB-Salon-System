import type { IdentityStore, AppEvent } from '../ports';
import type { IdentityLink } from '../types';

/** Canonical subject of an account, the same text server events use. */
export const accountSubject = (link: { actorType: string; actorId: string }): string =>
  `${link.actorType}:${link.actorId}`;

/** Subject of an app event nobody linked to an account. */
const guestSubject = (event: AppEvent): string =>
  event.userId === undefined ? `inst:${event.installationId}` : `user:${event.userId}`;

const preferred = (links: readonly IdentityLink[], userId: string | undefined): IdentityLink => {
  const exact = links.find((link) => link.actorId === userId);
  if (exact !== undefined) return exact;
  return [...links].sort((a, b) =>
    accountSubject(a) < accountSubject(b) ? -1 : 1,
  )[0] as IdentityLink;
};

/**
 * Maps every app event to a subject. An installation linked to an account (`linkIdentity`) takes
 * the account's subject, so guest history and registered history become ONE actor; with several
 * accounts on one device the account matching the event's Firebase user id wins. Unlinked
 * installations stay separate guests (`inst:` / `user:`).
 */
export const resolveAppSubjects = async (
  identity: IdentityStore,
  events: readonly AppEvent[],
): Promise<string[]> => {
  const installationIds = [...new Set(events.map((event) => event.installationId))];
  const links =
    installationIds.length === 0 ? [] : await identity.linksOfInstallations(installationIds);
  const byInstallation = new Map<string, IdentityLink[]>();
  for (const link of links) {
    const list = byInstallation.get(link.installationId);
    if (list === undefined) byInstallation.set(link.installationId, [link]);
    else list.push(link);
  }
  return events.map((event) => {
    const linked = byInstallation.get(event.installationId);
    return linked === undefined
      ? guestSubject(event)
      : accountSubject(preferred(linked, event.userId));
  });
};

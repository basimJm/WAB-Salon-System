import type { IdentityStore } from '../../ports';
import type { ActorRef, IdentityLink } from '../../types';

const linkKey = (link: IdentityLink): string =>
  `${link.installationId}|${link.actorType}|${link.actorId}`;

/** In-memory identity links for development and tests. */
export class MemoryIdentityStore implements IdentityStore {
  private readonly links = new Map<string, IdentityLink>();

  link(link: IdentityLink): Promise<void> {
    this.links.set(linkKey(link), {
      installationId: link.installationId,
      actorType: link.actorType,
      actorId: link.actorId,
    });
    return Promise.resolve();
  }

  linksOfActor(actor: ActorRef): Promise<IdentityLink[]> {
    return Promise.resolve(
      [...this.links.values()].filter(
        (link) => link.actorType === actor.actorType && link.actorId === actor.actorId,
      ),
    );
  }

  linksOfInstallations(installationIds: readonly string[]): Promise<IdentityLink[]> {
    const wanted = new Set(installationIds);
    return Promise.resolve(
      [...this.links.values()].filter((link) => wanted.has(link.installationId)),
    );
  }
}

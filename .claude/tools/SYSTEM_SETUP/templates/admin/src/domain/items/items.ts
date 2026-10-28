import type { Page, PageQuery } from '@/domain/shared/page';

/** The sample resource of the template: a named record with a status, written by admins with a reason. */
export const ITEM_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export const ITEM_SORT_KEYS = ['name', 'createdAt', 'updatedAt'] as const;
export type ItemSortKey = (typeof ITEM_SORT_KEYS)[number];

export interface Item {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: ItemStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Admin id of the last writer; null for a seeded record. */
  readonly updatedBy: string | null;
}
export interface ItemInput {
  name: string;
  description?: string | null;
  status?: ItemStatus;
}
export type ItemPatch = Partial<ItemInput>;

export interface ItemSort {
  key: ItemSortKey;
  direction: 'asc' | 'desc';
}
export interface ItemsQuery extends PageQuery {
  q?: string;
  status?: ItemStatus;
  sort?: ItemSort;
}

export interface ItemsRepository {
  list(query: ItemsQuery): Promise<Page<Item>>;
  get(id: string): Promise<Item>;
  create(input: ItemInput, reason: string): Promise<Item>;
  update(id: string, patch: ItemPatch, reason: string): Promise<Item>;
}

export const MAX_ITEM_NAME = 120;
export const MAX_ITEM_DESCRIPTION = 1000;
export type ItemFormError = 'name' | 'description';

export interface ItemDraft {
  name: string;
  description: string;
  status: ItemStatus;
}

/** A name between 1 and 120 characters; a description up to 1000. */
export function validateItemForm(d: Pick<ItemDraft, 'name' | 'description'>): ItemFormError[] {
  const errors: ItemFormError[] = [];
  const name = d.name.trim();
  if (name === '' || name.length > MAX_ITEM_NAME) errors.push('name');
  if (d.description.length > MAX_ITEM_DESCRIPTION) errors.push('description');
  return errors;
}

/** The body the server takes for a draft: trimmed name, empty description sent as null. */
export const itemInputOf = (d: ItemDraft): ItemInput => ({
  name: d.name.trim(),
  description: d.description.trim() === '' ? null : d.description.trim(),
  status: d.status,
});

export const isItemStatus = (value: unknown): value is ItemStatus =>
  ITEM_STATUSES.some((s) => s === value);
export const isItemSortKey = (value: unknown): value is ItemSortKey =>
  ITEM_SORT_KEYS.some((k) => k === value);

/** `{key: 'name', direction: 'desc'}` -> `-name` (the server's sort parameter). */
export const sortParamOf = (sort: ItemSort): string =>
  sort.direction === 'desc' ? `-${sort.key}` : sort.key;

/** The entity type the server writes in audit rows and alerts for an item. */
export const ITEM_ENTITY_TYPE = 'ITEM';

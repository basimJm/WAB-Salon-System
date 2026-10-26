import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  SEARCH_SHORTCUT_HINT,
  SEARCH_SHORTCUT_KEY,
} from '@/constants/ui';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cx } from '../../utils/cx';
import { Icon } from '../core/Icon';

export const SEARCH_GROUPS = ['customers', 'salons', 'bookings', 'members'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export interface SearchHit {
  id: string;
  label: string;
  /** Second line (phone, city, reference...). */
  hint?: string;
  /** Where picking the result goes. */
  to: string;
}

export type SearchResults = Readonly<Partial<Record<SearchGroup, readonly SearchHit[]>>>;

export interface GlobalSearchProps {
  /** Looks the text up on the server (customers, salons, bookings, members). Wired by the global-search task. */
  search: (query: string) => Promise<SearchResults>;
  onSelect: (hit: SearchHit) => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; hits: readonly { group: SearchGroup; hit: SearchHit }[] };

const flatten = (results: SearchResults) =>
  SEARCH_GROUPS.flatMap((group) => (results[group] ?? []).map((hit) => ({ group, hit })));

interface MessageInput {
  ready: boolean;
  typed: boolean;
  state: State;
  count: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/** The one line shown instead of (or above) results: too short, searching, failed, or nothing found. */
function statusMessage({ ready, typed, state, count, t }: MessageInput): string | null {
  if (!ready) return typed ? t('topbar.minChars', { min: SEARCH_MIN_CHARS }) : null;
  if (state.kind === 'loading') return t('topbar.searching');
  if (state.kind === 'error') return t('topbar.searchFailed');
  return count === 0 ? t('topbar.noResults') : null;
}

/** Top-bar search: results appear 500 ms after typing stops, grouped by type, reachable with the arrow keys. */
export function GlobalSearch({ search, onSelect }: GlobalSearchProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const query = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const ready = query.length >= SEARCH_MIN_CHARS;
  const input = useRef<HTMLInputElement>(null);

  // Cmd+K (macOS) / Ctrl+K anywhere focuses the search, like the design's hint says.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === SEARCH_SHORTCUT_KEY) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    void Promise.resolve().then(() => !cancelled && setState({ kind: 'loading' }));
    search(query).then(
      (results) => !cancelled && setState({ kind: 'done', hits: flatten(results) }),
      () => !cancelled && setState({ kind: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [query, ready, search]);

  const hits = ready && state.kind === 'done' ? state.hits : [];
  const pick = (hit: SearchHit) => {
    setOpen(false);
    setText('');
    onSelect(hit);
  };
  const message = statusMessage({ ready, typed: text.trim() !== '', state, count: hits.length, t });

  return (
    <div
      className="wab-gsearch"
      role="presentation"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <span className="wab-gsearch__icon">
        <Icon name="search" size="sm" />
      </span>
      <kbd className="wab-gsearch__kbd" aria-hidden="true">
        <bdi dir="ltr">{SEARCH_SHORTCUT_HINT}</bdi>
      </kbd>
      <input
        ref={input}
        aria-keyshortcuts="Meta+K Control+K"
        className="wab-field__control wab-gsearch__input"
        type="search"
        role="combobox"
        aria-label={t('topbar.search')}
        placeholder={t('topbar.search')}
        aria-expanded={open && (hits.length > 0 || message !== null)}
        aria-controls={listId}
        aria-activedescendant={open && hits.length > 0 ? `${listId}-${String(active)}` : undefined}
        autoComplete="off"
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === 'Enter' && open && hits[active]) {
            event.preventDefault();
            pick(hits[active].hit);
          }
        }}
      />
      {open && (hits.length > 0 || message) ? (
        <div
          id={listId}
          className="wab-gsearch__panel"
          role="listbox"
          aria-label={t('topbar.search')}
        >
          {message ? <p className="wab-gsearch__message">{message}</p> : null}
          {SEARCH_GROUPS.map((group) => {
            const inGroup = hits.filter((h) => h.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group} role="group" aria-label={t(`topbar.groups.${group}`)}>
                <p className="wab-gsearch__group">{t(`topbar.groups.${group}`)}</p>
                {inGroup.map((entry) => {
                  const index = hits.indexOf(entry);
                  return (
                    <div
                      key={entry.hit.id}
                      id={`${listId}-${String(index)}`}
                      role="option"
                      aria-selected={index === active}
                      tabIndex={-1}
                      className={cx(
                        'wab-gsearch__hit',
                        index === active && 'wab-gsearch__hit--active',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(entry.hit)}
                      onKeyDown={() => undefined}
                    >
                      <span className="wab-gsearch__initial" aria-hidden="true">
                        {Array.from(entry.hit.label.trim())[0] ?? ''}
                      </span>
                      <span className="wab-gsearch__text">
                        <span className="wab-gsearch__label">{entry.hit.label}</span>
                        {entry.hit.hint ? (
                          <span className="wab-gsearch__hint">{entry.hit.hint}</span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

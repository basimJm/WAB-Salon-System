/** Makes user text safe to put inside a RegExp: the text is a literal, never a pattern. */
export const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

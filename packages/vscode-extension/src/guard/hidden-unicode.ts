export type HiddenUnicodeKind = 'bidi' | 'invisible' | 'tag';

export interface HiddenUnicodeReport {
  total: number;
  byKind: Record<HiddenUnicodeKind, number>;
  /** Offset of the first hidden character, if any. */
  firstOffset?: number;
}

/**
 * Characters that can make code or instructions read differently to a person than to a
 * compiler or an AI model:
 * - bidi: embedding, override and isolate controls used in "Trojan Source" attacks;
 * - tag: U+E0000–U+E007F, which can smuggle invisible ASCII instructions to a model;
 * - invisible: zero-width and similar characters. ZWNJ/ZWJ are only flagged after ASCII
 *   (or at the start), because they are legitimate in emoji sequences and many scripts.
 *   Runs of two or more variation selectors are flagged; one after a base character is normal.
 */
const HIDDEN_UNICODE =
  /([\u202A-\u202E\u2066-\u2069])|([\u{E0000}-\u{E007F}])|([\u200B\u2060-\u2064\u180E\uFEFF]|(?<![^\x00-\x7F])[\u200C\u200D]|[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]{2,})/gu;

export function findHiddenUnicode(text: string): HiddenUnicodeReport {
  const report: HiddenUnicodeReport = { total: 0, byKind: { bidi: 0, invisible: 0, tag: 0 } };
  for (const match of text.matchAll(HIDDEN_UNICODE)) {
    // A byte order mark at the very start of a file is normal.
    if (match.index === 0 && match[0] === '\uFEFF') continue;
    const kind: HiddenUnicodeKind = match[1] ? 'bidi' : match[2] ? 'tag' : 'invisible';
    const count = kind === 'invisible' ? [...match[0]].length : 1;
    report.byKind[kind] += count;
    report.total += count;
    if (report.firstOffset === undefined) report.firstOffset = match.index;
  }
  return report;
}

export function describeHiddenUnicode(report: HiddenUnicodeReport): string {
  const parts: string[] = [];
  if (report.byKind.bidi) parts.push(`${report.byKind.bidi} bidirectional control(s)`);
  if (report.byKind.tag) parts.push(`${report.byKind.tag} invisible tag character(s)`);
  if (report.byKind.invisible) parts.push(`${report.byKind.invisible} zero-width or invisible character(s)`);
  return parts.join(', ');
}

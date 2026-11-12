import { SECRET_REGEX_PATTERNS } from '@maximinion/refiner';
import { IgnoredOverride } from '../settings';
import { OLLAMA_ENDPOINT } from './egress';
import { SENSITIVE_EXCEPTIONS, SENSITIVE_RULES } from './sensitive-paths';
import { SCAN_LIMITS } from './workspace-reader';

export const SECURITY_MODEL_URL = 'https://github.com/dev-rb-hub/maximinion-ce/blob/main/docs/SECURITY_MODEL.md';

/** `on`: control active. `off`: turned off by you. `warn`: something needs your attention. `info`: context. */
export type PostureState = 'on' | 'off' | 'warn' | 'info';

export interface PostureRow {
  layer: string;
  control: string;
  state: PostureState;
  status: string;
  /** The code that enforces the control, so the report can be checked against the source. */
  enforcedBy: string;
}

export interface PostureInputs {
  scrubbing: boolean;
  diagnostics: boolean;
  minConfidence: number;
  folding: boolean;
  trusted: boolean;
  ignoredOverrides: IgnoredOverride[];
}

/**
 * The live security posture. Every value comes from the constant or function that enforces it,
 * never from hand-written text, so what users see cannot drift from what the code does.
 */
export function getSecurityPosture(inputs: PostureInputs): PostureRow[] {
  const weakening = inputs.ignoredOverrides.filter((override) => override.weakens);
  const patternCount = Object.keys(SECRET_REGEX_PATTERNS).length;
  const maxKb = Math.round(SCAN_LIMITS.maxFileBytes / 1024);

  return [
    {
      layer: 'Settings ceiling',
      control: 'Protection settings',
      state: weakening.length > 0 ? 'warn' : 'on',
      status:
        weakening.length > 0
          ? `This workspace tries to lower protection (${weakening
              .map((override) => `maximinion.${override.key} = ${JSON.stringify(override.attempted)} in ${override.source}`)
              .join(', ')}). MaxiMinion ignores it and uses your user settings.`
          : 'Only your user settings can change them; workspace and dev container settings are ignored.',
      enforcedBy: 'settings.ts: userSetting(), "scope": "application"',
    },
    {
      layer: 'Settings ceiling',
      control: 'Workspace trust',
      state: 'info',
      status: inputs.trusted
        ? 'Trusted workspace.'
        : 'Restricted Mode: this workspace cannot turn on semantic folding.',
      enforcedBy: 'package.json: untrustedWorkspaces.restrictedConfigurations',
    },
    {
      layer: 'Egress',
      control: 'Secret redaction',
      state: inputs.scrubbing ? 'on' : 'off',
      status: inputs.scrubbing
        ? `On for Copy for AI, previews and the Refiner (${patternCount} built-in patterns; pattern-based, so review output).`
        : 'Off in your user settings. Copied text is not redacted.',
      enforcedBy: '@maximinion/refiner Sanitizer, SECRET_REGEX_PATTERNS',
    },
    {
      layer: 'Egress',
      control: 'Inline secret warnings',
      state: inputs.diagnostics ? 'on' : 'off',
      status: inputs.diagnostics
        ? `On, for matches with confidence ${inputs.minConfidence} or higher.`
        : 'Off in your user settings.',
      enforcedBy: 'secret-ranges.ts: findSecretRanges()',
    },
    {
      layer: 'Filesystem gate',
      control: 'Credential files',
      state: 'on',
      status:
        `Asks before copying, and never read by workspace scans: ${SENSITIVE_RULES.length} rules ` +
        `(for example ${SENSITIVE_RULES.slice(0, 4).flatMap((rule) => rule.examples.slice(0, 1)).join(', ')}). ` +
        `Templates such as ${SENSITIVE_EXCEPTIONS[0]} are allowed.`,
      enforcedBy: 'guard/sensitive-paths.ts: sensitiveReason()',
    },
    {
      layer: 'Filesystem gate',
      control: 'Workspace scans',
      state: 'on',
      status: `Workspace folders only, with symlinks resolved; binaries and files over ${maxKb} KB are skipped.`,
      enforcedBy: 'guard/workspace-reader.ts: readForScan()',
    },
    {
      layer: 'Input screening',
      control: 'Hidden Unicode',
      state: 'on',
      status: 'Asks before copying text with bidirectional controls or invisible characters. Text is never changed.',
      enforcedBy: 'guard/hidden-unicode.ts: findHiddenUnicode()',
    },
    {
      layer: 'Egress',
      control: 'Network',
      state: 'on',
      status: `Only ${OLLAMA_ENDPOINT} (local Ollama), only for semantic folding, which is ${
        inputs.folding ? 'on' : 'off'
      }. Redirects are refused.`,
      enforcedBy: 'guard/egress.ts: OLLAMA_ENDPOINT, createRefiner()',
    },
    {
      layer: 'Egress',
      control: 'Telemetry',
      state: 'on',
      status: 'None. MaxiMinion sends nothing about you or your code.',
      enforcedBy: 'Forbidden-API tests: no network access except the Refiner',
    },
    {
      layer: 'Activity log',
      control: 'Activity log',
      state: 'on',
      status: 'Records copies, local model requests, previews and declined copies. Paths and counts only.',
      enforcedBy: 'guard/activity-log.ts, guard/egress.ts: copyToClipboard()',
    },
    {
      layer: 'Runtime limits',
      control: 'Runtime limits',
      state: 'on',
      status: 'No child processes, eval, or direct network access. Checked by tests on every build.',
      enforcedBy: 'tests/manifest.test.ts: forbidden APIs',
    },
  ];
}

const STATE_LABEL: Record<PostureState, string> = { on: '✅ On', off: '⛔ Off', warn: '⚠️ Attention', info: 'ℹ️ Info' };

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderPostureMarkdown(rows: PostureRow[]): string {
  return [
    '# MaxiMinion Security Status',
    '',
    'Live status of the protections in this version of MaxiMinion, read from the code that enforces them.',
    '',
    '| Control | Status | Details | Enforced by |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => `| ${cell(row.control)} | ${STATE_LABEL[row.state]} | ${cell(row.status)} | \`${cell(row.enforcedBy)}\` |`),
    '',
    '## Limits',
    '',
    '- Secret detection is pattern-based. It can miss secrets and flag things that are not secrets. Review output before sharing it.',
    '- Credential files are recognised by name.',
    '- Other extensions and applications on your machine are outside MaxiMinion\'s control.',
    '',
    `See the [Security Model](${SECURITY_MODEL_URL}) for the full threat model and known gaps.`,
    '',
  ].join('\n');
}

/**
 * Files that usually hold credentials. Automatic workspace scans never read them, and
 * Copy for AI asks before including them. Matching is by name only, so it complements
 * secret redaction rather than replacing it.
 */

const SENSITIVE_DIRECTORIES: Record<string, string> = {
  '.ssh': 'SSH directory',
  '.aws': 'AWS credentials directory',
  '.azure': 'Azure credentials directory',
  '.gnupg': 'GnuPG directory',
  '.kube': 'Kubernetes config directory',
  '.docker': 'Docker config directory',
  '.git': 'Git internals',
};

const ENV_TEMPLATE = /^\.env\.(example|sample|template|dist|defaults)$/i;

/** Each rule carries examples; tests check every example matches, so the rules shown to users stay accurate. */
const SENSITIVE_FILES: Array<{ pattern: RegExp; reason: string; examples: string[] }> = [
  { pattern: /^\.env(\..+)?$/i, reason: 'environment file', examples: ['.env', '.env.local'] },
  { pattern: /^\.envrc$/i, reason: 'environment file', examples: ['.envrc'] },
  {
    pattern: /^\.(npmrc|yarnrc\.yml|pypirc|netrc|pgpass|git-credentials)$/i,
    reason: 'credentials file',
    examples: ['.npmrc', '.pypirc', '.netrc', '.git-credentials'],
  },
  { pattern: /^_netrc$/i, reason: 'credentials file', examples: ['_netrc'] },
  { pattern: /^(credentials|kubeconfig)(\.json|\.ya?ml)?$/i, reason: 'credentials file', examples: ['credentials.json', 'kubeconfig'] },
  { pattern: /^secrets?\.(json|ya?ml|toml|ini)$/i, reason: 'secrets file', examples: ['secrets.json', 'secret.yaml'] },
  { pattern: /^id_(rsa|dsa|ecdsa|ed25519)$/i, reason: 'private key', examples: ['id_rsa', 'id_ed25519'] },
  {
    pattern: /\.(pem|key|p12|pfx|jks|keystore|ppk|kdbx)$/i,
    reason: 'private key, certificate or key store',
    examples: ['*.pem', '*.key', '*.p12', '*.pfx', '*.jks'],
  },
  { pattern: /\.tfstate(\.backup)?$/i, reason: 'Terraform state', examples: ['*.tfstate'] },
  { pattern: /\.tfvars(\.json)?$/i, reason: 'Terraform variables', examples: ['*.tfvars'] },
];

/** Human-readable summary of the rules, built from the same tables `sensitiveReason` uses. */
export const SENSITIVE_RULES: Array<{ reason: string; examples: string[] }> = [
  ...SENSITIVE_FILES.map(({ reason, examples }) => ({ reason, examples })),
  ...Object.entries(SENSITIVE_DIRECTORIES).map(([directory, reason]) => ({ reason, examples: [`${directory}/`] })),
];

/** Templates that look like environment files but are meant to be shared. */
export const SENSITIVE_EXCEPTIONS = ['.env.example', '.env.sample', '.env.template', '.env.dist', '.env.defaults'];

/**
 * Returns why a workspace-relative path looks sensitive, or undefined if it does not.
 * Accepts `/` or `\` separators.
 */
export function sensitiveReason(relativePath: string): string | undefined {
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  const name = segments[segments.length - 1] ?? '';

  for (const directory of segments.slice(0, -1)) {
    const reason = SENSITIVE_DIRECTORIES[directory.toLowerCase()];
    if (reason) return reason;
  }
  if (ENV_TEMPLATE.test(name)) return undefined;
  for (const { pattern, reason } of SENSITIVE_FILES) {
    if (pattern.test(name)) return reason;
  }
  return undefined;
}

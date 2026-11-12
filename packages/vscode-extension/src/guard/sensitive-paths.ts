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

const SENSITIVE_FILES: Array<[RegExp, string]> = [
  [/^\.env(\..+)?$/i, 'environment file'],
  [/^\.envrc$/i, 'environment file'],
  [/^\.(npmrc|yarnrc\.yml|pypirc|netrc|pgpass|git-credentials)$/i, 'credentials file'],
  [/^_netrc$/i, 'credentials file'],
  [/^(credentials|kubeconfig)(\.json|\.ya?ml)?$/i, 'credentials file'],
  [/^secrets?\.(json|ya?ml|toml|ini)$/i, 'secrets file'],
  [/^id_(rsa|dsa|ecdsa|ed25519)$/i, 'private key'],
  [/\.(pem|key|p12|pfx|jks|keystore|ppk|kdbx)$/i, 'private key, certificate or key store'],
  [/\.tfstate(\.backup)?$/i, 'Terraform state'],
  [/\.tfvars(\.json)?$/i, 'Terraform variables'],
];

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
  for (const [pattern, reason] of SENSITIVE_FILES) {
    if (pattern.test(name)) return reason;
  }
  return undefined;
}

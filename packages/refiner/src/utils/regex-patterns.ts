/**
 * Phase 1: THE REFINER - Regex Patterns for Secret Detection
 * Comprehensive patterns for common secret types
 */

export const SECRET_REGEX_PATTERNS = {
  // AWS Access Key Format: AKIA + 16 alphanumeric characters
  AWS_KEY: {
    pattern: 'AKIA[0-9A-Z]{16}',
    type: 'AWS_KEY' as const,
    confidence: 0.95,
    description: 'AWS Access Key ID'
  },

  // AWS Secret Access Key Format
  AWS_SECRET: {
    pattern: 'aws_secret_access_key["\']?\\s*[:=]\\s*["\']?([A-Za-z0-9/+=]{40})',
    type: 'AWS_KEY' as const,
    confidence: 0.9,
    description: 'AWS Secret Access Key'
  },

  // Generic API Key Pattern
  API_KEY: {
    pattern: '(api_key|apiKey|API_KEY)["\']?\\s*[:=]\\s*["\']?([A-Za-z0-9_-]{20,})',
    type: 'API_KEY' as const,
    confidence: 0.75,
    description: 'Generic API Key'
  },

  // Azure Connection String
  AZURE_CONNECTION_STRING: {
    pattern: 'DefaultEndpointsProtocol=https;AccountName=[A-Za-z0-9]+;AccountKey=[A-Za-z0-9/+=]+',
    type: 'AZURE_KEY' as const,
    confidence: 0.95,
    description: 'Azure Storage Connection String'
  },

  // OpenAI API Key Format: sk-proj-...
  OPENAI_API_KEY: {
    pattern: 'sk-proj-[A-Za-z0-9_-]{20,}',
    type: 'API_KEY' as const,
    confidence: 0.9,
    description: 'OpenAI API Key'
  },

  // Generic Private Key (RSA, ECDSA, etc.)
  PRIVATE_KEY: {
    pattern: '-----BEGIN ([A-Z ]+) PRIVATE KEY-----',
    type: 'PRIVATE_KEY' as const,
    confidence: 0.99,
    description: 'Private Key (RSA, ECDSA, EC, etc.)'
  },

  // Password Assignment Pattern
  PASSWORD: {
    pattern: '(password|passwd|pwd)["\']?\\s*[:=]\\s*["\']?([^"\']\\S+)',
    type: 'PASSWORD' as const,
    confidence: 0.7,
    description: 'Password Assignment'
  },

  // Generic Token Pattern
  TOKEN: {
    pattern: '(token|access_token|refresh_token|bearer)["\']?\\s*[:=]\\s*["\']?([A-Za-z0-9_.-]+)',
    type: 'TOKEN' as const,
    confidence: 0.65,
    description: 'Authentication Token'
  },

  // Email Address Pattern
  EMAIL: {
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    type: 'EMAIL' as const,
    confidence: 0.8,
    description: 'Email Address'
  },

  // Social Security Number (XXX-XX-XXXX)
  SSN: {
    pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    type: 'SSN' as const,
    confidence: 0.85,
    description: 'Social Security Number'
  },

  // Credit Card Number (Visa, Mastercard, Amex, Discover)
  CREDIT_CARD: {
    pattern: '\\b(?:\\d[ -]*?){13,16}\\b',
    type: 'CREDIT_CARD' as const,
    confidence: 0.6,
    description: 'Credit Card Number'
  },

  // Environment Variable Assignment (common patterns)
  ENV_VAR: {
    pattern: '(process\\.env\\.|process\\.env\\[|os\\.environ\\[|os\\.getenv\\()[A-Z_]+["\']?',
    type: 'ENV_VAR' as const,
    confidence: 0.85,
    description: 'Environment Variable Reference'
  },

  // Generic Secret Pattern (high entropy strings)
  GENERIC_SECRET: {
    pattern: '(secret|apikey|api_secret)["\']?\\s*[:=]\\s*["\']?([A-Za-z0-9_/+=]{32,})',
    type: 'GENERIC_SECRET' as const,
    confidence: 0.6,
    description: 'Generic Secret String'
  },

  // Database Connection String
  DB_CONNECTION: {
    pattern: '(mongodb|postgres|mysql|sql)://[^\\s]+:[^@\\s]+@[^\\s]+',
    type: 'PRIVATE_KEY' as const,
    confidence: 0.85,
    description: 'Database Connection String'
  },

  // JWT Token Format (header.payload.signature)
  JWT: {
    pattern: 'eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
    type: 'TOKEN' as const,
    confidence: 0.9,
    description: 'JWT Token'
  },

  // GitHub Personal Access Token
  GITHUB_PAT: {
    pattern: 'ghp_[A-Za-z0-9_]{36}',
    type: 'API_KEY' as const,
    confidence: 0.95,
    description: 'GitHub Personal Access Token'
  },

  // Slack Bot Token
  SLACK_BOT_TOKEN: {
    pattern: 'xoxb-[A-Za-z0-9_-]{10,13}-[A-Za-z0-9_-]{10,13}-[A-Za-z0-9_-]{24}',
    type: 'API_KEY' as const,
    confidence: 0.95,
    description: 'Slack Bot Token'
  }
};

/**
 * Compact format for regex patterns as array of [pattern, type, confidence]
 */
export const COMPACT_PATTERNS = Object.entries(SECRET_REGEX_PATTERNS).map(([_key, config]) => [
  config.pattern,
  config.type,
  config.confidence
]);

/**
 * High-confidence patterns (>= 0.9) for first-pass detection
 */
export const HIGH_CONFIDENCE_PATTERNS = Object.entries(SECRET_REGEX_PATTERNS)
  .filter(([_key, config]) => config.confidence >= 0.9)
  .reduce((acc, [key, config]) => {
    (acc as Record<string, any>)[key] = config;
    return acc;
  }, {} as Record<string, any>);

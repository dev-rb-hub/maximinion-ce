/**
 * Phase 1: THE REFINER - Type Definitions
 * Core data structures for sanitization, entropy calculation, and semantic folding
 */

/**
 * Configuration for the Refiner
 */
export interface RefinerConfig {
  enableSemanticFolding?: boolean;
  enableMLSanitizer?: boolean;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  customRegexPatterns?: RegexPatternSet;
  cacheFoldedSummaries?: boolean;
}

/**
 * Sanitization result
 */
export interface SanitizedText {
  text: string;
  scrubbed: ScrubbedItem[];
  originalLength: number;
  sanitizedLength: number;
}

/**
 * Record of scrubbed sensitive data
 */
export interface ScrubbedItem {
  type: SecretType;
  pattern: string;
  location: number; // character offset in original text
  replacement: string;
}

/**
 * Types of secrets that can be detected
 */
export type SecretType =
  | 'API_KEY'
  | 'AWS_KEY'
  | 'AZURE_KEY'
  | 'PRIVATE_KEY'
  | 'PASSWORD'
  | 'TOKEN'
  | 'EMAIL'
  | 'SSN'
  | 'CREDIT_CARD'
  | 'ENV_VAR'
  | 'GENERIC_SECRET'
  | 'UNKNOWN';

/**
 * Set of regex patterns for secret detection
 */
export interface RegexPatternSet {
  [key: string]: RegexPattern;
}

/**
 * Single regex pattern with metadata
 */
export interface RegexPattern {
  pattern: string;
  type: SecretType;
  confidence: number; // 0-1
  description: string;
}

/**
 * Shannon Entropy score for code block
 */
export interface EntropyScore {
  value: number; // 0-8 typically
  rating: SignalRating;
  signal: number; // 0-1 confidence
  description: string;
}

/**
 * Signal rating classification
 */
export type SignalRating = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Code block with metadata
 */
export interface CodeBlock {
  content: string;
  entropy: EntropyScore;
  folded?: FoldedSummary;
  metadata: CodeBlockMetadata;
  originalTokenCount?: number;
  refinedTokenCount?: number;
}

/**
 * Metadata about a code block
 */
export interface CodeBlockMetadata {
  line: number;
  endLine: number;
  type: BlockType;
  name?: string;
  language?: string;
}

/**
 * Type of code block
 */
export type BlockType = 'function' | 'class' | 'method' | 'import' | 'comment' | 'code' | 'unknown';

/**
 * Semantic folding result
 */
export interface FoldedSummary {
  summary: string;
  confidence: number; // 0-1
  tokensSaved: number;
  model: string;
  timestamp: Date;
}

/**
 * Final refined output from the Refiner
 */
export interface RefinedOutput {
  sanitizedText: string;
  blocks: CodeBlock[];
  metadata: RefinerMetadata;
}

/**
 * Optimization metadata from the Refiner
 */
export interface RefinerMetadata {
  totalTokens: number;
  originalTokens: number;
  noisyBlocks: number;
  foldedFunctions: number;
  compressionRatio: number;
  signalToNoiseRatio: number; // HIGH signal blocks / total blocks
  processingTimeMs: number;
  sanitizationStats: SanitizationStats;
}

/**
 * Sanitization statistics
 */
export interface SanitizationStats {
  totalScrubbed: number;
  byType: Record<SecretType, number>;
  entropyReduction: number; // percentage
}

/**
 * Token counter configuration
 */
export interface TokenCounterConfig {
  model?: string; // for estimation
  countMethod?: 'approximate' | 'precise';
}

/**
 * Ollama integration response
 */
export interface OllamaFoldResponse {
  model: string;
  summary: string;
  confidence: number;
  tokensSaved: number;
  processingTimeMs: number;
}

/**
 * Entropy calculation result (internal)
 */
export interface EntropyCalculation {
  value: number;
  charFrequency: Record<string, number>;
  totalChars: number;
}

/**
 * Refiner options for batch processing
 */
export interface RefinerOptions {
  maxBlockSize?: number; // max characters per block
  batchSize?: number; // for Ollama folding
  parallelFolding?: number; // concurrent Ollama requests
}

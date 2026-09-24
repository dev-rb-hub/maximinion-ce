/**
 * Phase 1: THE REFINER - Token Counter Utility
 * Estimate token counts using common LLM tokenization methods
 */

/**
 * Approximate token count using word and punctuation heuristic
 * Based on OpenAI's GPT token counting (rough approximation)
 * 
 * Formula: ~1.3 tokens per word (accounting for subword tokenization)
 * This is a conservative estimate; actual count varies by model
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;

  // Split by whitespace to get approximate word count
  const words = text.trim().split(/\s+/).length;

  // Split by punctuation to account for subword tokenization
  const punctuationMarks = (text.match(/[.,!?;:\-()[\]{}]/g) || []).length;

  // Base estimation: words * 1.3 (typical for English/code)
  // Add punctuation tokens
  const estimatedTokens = Math.ceil(words * 1.3 + punctuationMarks * 0.3);

  return Math.max(1, estimatedTokens); // Minimum 1 token
}

/**
 * More precise token count using character-based calculation
 * Assumes average token is ~4-5 characters (common for GPT models)
 */
export function estimateTokenCountByChars(text: string, charPerToken: number = 4.5): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / charPerToken);
}

/**
 * Hybrid estimation combining word and character methods
 */
export function estimateTokenCountHybrid(text: string): number {
  const wordBased = estimateTokenCount(text);
  const charBased = estimateTokenCountByChars(text);

  // Use average of both methods for better accuracy
  return Math.ceil((wordBased + charBased) / 2);
}

/**
 * Count tokens in code specifically (accounts for keywords, operators, etc.)
 */
export function estimateCodeTokenCount(code: string): number {
  if (!code || code.length === 0) return 0;

  // Code has more tokens due to operators, braces, etc.
  // Approximately 1.5-2 tokens per word in code
  const words = code.trim().split(/\s+/).length;
  const operators = (code.match(/[=+\-*/%<>!&|^~(){}\[\];:,]/g) || []).length;
  const strings = (code.match(/["'`]/g) || []).length;

  // More tokens for operators and string delimiters
  return Math.ceil(words * 1.8 + operators * 0.5 + strings * 0.25);
}

/**
 * Count tokens across multiple blocks
 */
export function estimateTotalTokenCount(blocks: string[]): number {
  return blocks.reduce((total, block) => total + estimateTokenCount(block), 0);
}

/**
 * Estimate token count for a code block, detecting language if possible
 */
export function estimateBlockTokenCount(
  block: string,
  language?: string
): number {
  if (language && ['js', 'ts', 'py', 'java', 'cs', 'go', 'rs', 'cpp'].includes(language)) {
    return estimateCodeTokenCount(block);
  }
  return estimateTokenCount(block);
}

/**
 * Calculate compression ratio: original tokens / compressed tokens
 */
export function calculateCompressionRatio(originalTokens: number, refinedTokens: number): number {
  if (refinedTokens === 0) return Infinity;
  return originalTokens / refinedTokens;
}

/**
 * Calculate token savings in absolute and percentage terms
 */
export function calculateTokenSavings(originalTokens: number, refinedTokens: number) {
  const absolute = originalTokens - refinedTokens;
  const percentage = (absolute / originalTokens) * 100;
  return {
    absolute,
    percentage: Math.round(percentage * 100) / 100,
    ratio: calculateCompressionRatio(originalTokens, refinedTokens)
  };
}

/**
 * Estimate cost savings based on API pricing
 * Default: OpenAI GPT-4 pricing (rough estimates)
 */
export function estimateCostSavings(
  originalTokens: number,
  refinedTokens: number,
  costPerMToken: number = 0.015 // $0.015 per 1M tokens (rough GPT-4 pricing)
): number {
  const tokensPerMillion = 1_000_000;
  const originalCost = (originalTokens / tokensPerMillion) * costPerMToken;
  const refinedCost = (refinedTokens / tokensPerMillion) * costPerMToken;
  return originalCost - refinedCost;
}

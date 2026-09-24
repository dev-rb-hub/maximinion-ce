/**
 * Phase 1: The Refiner - Code Examples
 * 
 * This file demonstrates how to use the Refiner for code sanitization
 * and semantic compression.
 */

import { Refiner, RefinerOptions, RefinerResult } from '@maximinion/refiner';
import * as fs from 'fs';

/**
 * Example 1: Basic Sanitization
 * Remove secrets and PII from code
 */
async function example1_basicSanitization() {
  const refiner = new Refiner({
    enableSemanticFolding: false,
    entropyThreshold: 0.3,
  });

  const code = `
    const API_KEY = 'sk-abc123def456'; // OpenAI API key
    const dbPassword = 'mySecurePassword123';
    const email = 'user@example.com';
    
    function fetchData() {
      return fetch('https://api.openai.com/v1/chat/completions', {
        headers: {
          Authorization: \`Bearer \${API_KEY}\`
        }
      });
    }
  `;

  const result = await refiner.sanitize(code);
  console.log('Sanitized code:');
  console.log(result);
  // Output: All secrets replaced with [SANITIZED_*]
}

/**
 * Example 2: Entropy Analysis
 * Measure signal-to-noise ratio in code
 */
async function example2_entropyAnalysis() {
  const refiner = new Refiner();

  const cleanCode = `
    function calculateSum(arr) {
      return arr.reduce((a, b) => a + b, 0);
    }
  `;

  const noisyCode = `
    // TODO: Fix this
    // FIXME: Performance issue
    // NOTE: Refactor later
    /* 
      This function calculates the sum of an array.
      It uses the reduce method which is efficient.
      We should test this more thoroughly.
      Also check edge cases.
    */
    function calculateSum(arr) {
      // Calculate sum
      return arr.reduce((a, b) => a + b, 0); // Add elements
    }
  `;

  const cleanEntropy = refiner.calculateEntropy(cleanCode);
  const noisyEntropy = refiner.calculateEntropy(noisyCode);

  console.log(`Clean code entropy: ${cleanEntropy.toFixed(3)}`);
  console.log(`Noisy code entropy: ${noisyEntropy.toFixed(3)}`);
  // Output: Clean ~0.2, Noisy ~0.6 (0=signal, 1=noise)
}

/**
 * Example 3: Semantic Folding with Ollama
 * Compress code while preserving logic (requires Ollama)
 */
async function example3_semanticFolding() {
  const refiner = new Refiner({
    enableSemanticFolding: true,
    ollamaModel: 'mistral',
  });

  const verboseCode = fs.readFileSync('./src/utils.ts', 'utf-8');

  try {
    const compressed = await refiner.fold(verboseCode);
    console.log('Compressed code:');
    console.log(compressed);
    
    const ratio = compressed.length / verboseCode.length;
    console.log(`Compression ratio: ${(ratio * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('Ollama not available. Run: ollama serve');
  }
}

/**
 * Example 4: Batch Processing
 * Process entire directory with detailed analysis
 */
async function example4_batchProcessing() {
  const refiner = new Refiner({
    enableSemanticFolding: false,
    entropyThreshold: 0.4,
  });

  const result = await refiner.process('./src');

  console.log('Batch Processing Results:');
  console.log(`Secrets removed: ${result.removalStats.secretsRemoved}`);
  console.log(`PII removed: ${result.removalStats.piiRemoved}`);
  console.log(`Comments removed: ${result.removalStats.commentsRemoved}`);
  console.log(`Boilerplate removed: ${result.removalStats.boilerplateRemoved}`);
  console.log(`Total compression: ${(result.compressionRatio * 100).toFixed(1)}%`);
  console.log(`Execution time: ${result.executionTime}ms`);

  // Save result
  fs.writeFileSync('refiner-result.json', JSON.stringify(result, null, 2));
}

/**
 * Example 5: Custom Secret Patterns
 * Add organization-specific secret detection
 */
async function example5_customPatterns() {
  const refiner = new Refiner({
    secretPatterns: [
      // Standard patterns (built-in)
      'sk-.*',      // OpenAI
      'AKIA.*',     // AWS
      
      // Custom patterns for your org
      'COMPANY_SECRET_[A-Z0-9]{20}',
      'mongodb://.*:.*@',
      'jdbc:mysql://.*:.*@',
    ],
  });

  const code = `
    const companySecret = 'COMPANY_SECRET_ABCDEF1234567890GHIJ';
    const mongoDB = 'mongodb://user:password@db.example.com:27017/mydb';
  `;

  const result = await refiner.sanitize(code);
  console.log('Sanitized with custom patterns:');
  console.log(result);
}

/**
 * Example 6: Programmatic Integration
 * Use Refiner in a CI/CD pipeline
 */
async function example6_cicdIntegration() {
  const refiner = new Refiner({
    enableSemanticFolding: true,
    entropyThreshold: 0.3,
  });

  // Pre-commit hook
  async function checkCodeBeforeCommit(filePath: string): Promise<boolean> {
    try {
      const result = await refiner.process(filePath);

      // Fail if suspicious secrets detected
      if (result.removalStats.secretsRemoved > 0) {
        console.error(`❌ BLOCKED: ${result.removalStats.secretsRemoved} secrets found!`);
        return false;
      }

      // Warn if high noise
      if (result.entropyScore > 0.6) {
        console.warn(`⚠️  WARNING: High noise detected (entropy: ${result.entropyScore})`);
      }

      console.log(`✓ Code is clean. Compression: ${(result.compressionRatio * 100).toFixed(1)}%`);
      return true;
    } catch (error) {
      console.error('Error checking code:', error);
      return false;
    }
  }

  // Check a file
  const isClean = await checkCodeBeforeCommit('./src/app.ts');
  if (!isClean) process.exit(1);
}

/**
 * Example 7: Different Modes
 * Conservative vs Aggressive sanitization
 */
async function example7_modes() {
  const conservativeRefiner = new Refiner({
    mode: 'conservative',  // Keep more code, remove only obvious secrets
  });

  const aggressiveRefiner = new Refiner({
    mode: 'aggressive',   // Remove secrets, PII, and suspicious patterns
  });

  const code = fs.readFileSync('./src/example.ts', 'utf-8');

  const conservative = await conservativeRefiner.process(code);
  const aggressive = await aggressiveRefiner.process(code);

  console.log('Compression Ratios:');
  console.log(`Conservative: ${(conservative.compressionRatio * 100).toFixed(1)}%`);
  console.log(`Aggressive: ${(aggressive.compressionRatio * 100).toFixed(1)}%`);
}

// Run examples
async function main() {
  console.log('=== Phase 1: Refiner Examples ===\n');

  try {
    console.log('Example 1: Basic Sanitization');
    await example1_basicSanitization();
    console.log('\n---\n');

    console.log('Example 2: Entropy Analysis');
    await example2_entropyAnalysis();
    console.log('\n---\n');

    console.log('Example 3: Semantic Folding');
    await example3_semanticFolding();
    console.log('\n---\n');

    console.log('Example 5: Custom Patterns');
    await example5_customPatterns();
    console.log('\n---\n');

    // Add more examples as needed
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

main();

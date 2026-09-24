#!/usr/bin/env node

/**
 * Phase 1: THE REFINER - CLI Tool
 * Manual testing and demonstration of the Refiner engine
 */

import * as fs from 'fs';
import * as path from 'path';
import { Refiner } from './core/refiner';

const args = process.argv.slice(2);
const command = args[0];

const showHelp = () => {
  console.log(`
MaxiMinion.AI Phase 1: THE REFINER - CLI Tool

Usage:
  npx ts-node src/cli.ts [command] [options]

Commands:
  sanitize <file>          Sanitize code file (remove secrets)
  entropy <file>           Calculate entropy scores for code
  refine <file>            Full refinement pipeline
  batch <directory>        Refine all .ts/.js files in directory
  demo                     Run demonstration with sample code
  help                     Show this help message

Examples:
  npx ts-node src/cli.ts sanitize src/example.ts
  npx ts-node src/cli.ts entropy src/example.ts
  npx ts-node src/cli.ts refine src/example.ts
  npx ts-node src/cli.ts batch ./src
  npx ts-node src/cli.ts demo
  `);
};

const readFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    process.exit(1);
  }
};

const sanitizeCommand = async (filePath: string) => {
  console.log(`\n📋 SANITIZING: ${filePath}\n`);

  const code = readFile(filePath);
  const refiner = new Refiner({ enableSemanticFolding: false });
  const result = refiner.sanitize(code);

  console.log('=== SANITIZED OUTPUT ===');
  console.log(result.text);

  if (result.scrubbed.length > 0) {
    console.log('\n=== SECRETS REMOVED ===');
    result.scrubbed.forEach((item, index) => {
      console.log(`${index + 1}. [${item.type}] at position ${item.location}: "${item.pattern}"`);
    });
  }

  console.log('\n=== STATISTICS ===');
  console.log(`Original length: ${result.originalLength} chars`);
  console.log(`Sanitized length: ${result.sanitizedLength} chars`);
  console.log(`Secrets removed: ${result.scrubbed.length}`);
  const stats = refiner.getStatistics();
  console.log(`Details:`, stats.sanitizer);
};

const entropyCommand = async (filePath: string) => {
  console.log(`\n📊 ENTROPY ANALYSIS: ${filePath}\n`);

  const code = readFile(filePath);
  const refiner = new Refiner({ enableSemanticFolding: false });

  const lines = code.split('\n');
  const blockEntropies = lines
    .filter(line => line.trim().length > 0)
    .map((line, index) => ({
      line: index + 1,
      content: line.substring(0, 60) + (line.length > 60 ? '...' : ''),
      entropy: refiner.calculateEntropy(line)
    }));

  console.log('=== LINE ENTROPY SCORES ===');
  blockEntropies.forEach(block => {
    const bar = '█'.repeat(Math.round(block.entropy.value / 8 * 50));
    console.log(
      `Line ${block.line.toString().padEnd(3)} | H=${block.entropy.value.toFixed(2)} | ${block.entropy.rating.padEnd(6)} | ${bar} | ${block.content}`
    );
  });

  const avgEntropy =
    blockEntropies.reduce((sum, b) => sum + b.entropy.value, 0) / blockEntropies.length;
  const highSignal = blockEntropies.filter(b => b.entropy.rating === 'HIGH').length;

  console.log('\n=== STATISTICS ===');
  console.log(`Average Entropy: ${avgEntropy.toFixed(2)}`);
  console.log(`High Signal Lines: ${highSignal}/${blockEntropies.length} (${((highSignal / blockEntropies.length) * 100).toFixed(1)}%)`);
};

const refineCommand = async (filePath: string) => {
  console.log(`\n⚙️  FULL REFINEMENT PIPELINE: ${filePath}\n`);

  const code = readFile(filePath);
  const refiner = new Refiner({ enableSemanticFolding: false });

  const result = await refiner.refine(code);

  console.log('=== REFINED OUTPUT ===');
  console.log(result.sanitizedText);

  console.log('\n=== BLOCKS PROCESSED ===');
  result.blocks.forEach((block, index) => {
    console.log(`Block ${index + 1}:`);
    console.log(`  Content: ${block.content.substring(0, 50)}...`);
    console.log(`  Entropy: ${block.entropy.value.toFixed(2)} (${block.entropy.rating})`);
    console.log(`  Original Tokens: ${block.originalTokenCount}`);
    console.log(`  Refined Tokens: ${block.refinedTokenCount}`);
    if (block.folded) {
      console.log(`  Folded: ${block.folded.summary.substring(0, 40)}...`);
    }
  });

  console.log('\n=== METADATA ===');
  console.log(`Original Tokens: ${result.metadata.originalTokens}`);
  console.log(`Refined Tokens: ${result.metadata.totalTokens}`);
  console.log(`Compression Ratio: ${result.metadata.compressionRatio.toFixed(2)}x`);
  console.log(`Signal-to-Noise Ratio: ${(result.metadata.signalToNoiseRatio * 100).toFixed(1)}%`);
  console.log(`Noisy Blocks: ${result.metadata.noisyBlocks}`);
  console.log(`Folded Functions: ${result.metadata.foldedFunctions}`);
  console.log(`Processing Time: ${result.metadata.processingTimeMs}ms`);
};

const batchCommand = async (directory: string) => {
  console.log(`\n📦 BATCH REFINEMENT: ${directory}\n`);

  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .map(f => path.join(directory, f));

  if (files.length === 0) {
    console.log('No TypeScript/JavaScript files found.');
    return;
  }

  const refiner = new Refiner({ enableSemanticFolding: false });
  let totalOriginal = 0;
  let totalRefined = 0;

  for (const file of files) {
    const code = readFile(file);
    const result = await refiner.refine(code);
    totalOriginal += result.metadata.originalTokens;
    totalRefined += result.metadata.totalTokens;

    console.log(`✓ ${file}`);
    console.log(`  Original: ${result.metadata.originalTokens} tokens → Refined: ${result.metadata.totalTokens} tokens (${result.metadata.compressionRatio.toFixed(2)}x)`);
  }

  console.log(`\n=== BATCH SUMMARY ===`);
  console.log(`Files processed: ${files.length}`);
  console.log(`Total original tokens: ${totalOriginal}`);
  console.log(`Total refined tokens: ${totalRefined}`);
  console.log(`Overall compression: ${(totalOriginal / totalRefined).toFixed(2)}x`);
};

const demoCommand = async () => {
  console.log(`\n🎯 DEMONSTRATION - Phase 1: THE REFINER\n`);

  const demoCode = `
// Example code with secrets and noise
const config = {
  apiKey: "sk-proj-abcdef1234567890abcdef1234567890",
  awsKey: "AKIAI44QH8DHBEXAMPLE",
  database: "postgres://user:pass@localhost:5432/db"
};

// Noisy import section
import React from "react";
import { Component } from "react";
import { useState } from "react";
import { useEffect } from "react";

// Signal-rich algorithm
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}

// Noise: comment spam
// TODO: fix this
// NOTE: remember to check
// HACK: this is temporary
const result = quickSort([5, 2, 8, 1, 9]);
`;

  const refiner = new Refiner({ enableSemanticFolding: false });
  const result = await refiner.refine(demoCode);

  console.log('=== ORIGINAL CODE ===');
  console.log(demoCode);

  console.log('\n=== SANITIZED & REFINED ===');
  console.log(result.sanitizedText);

  console.log('\n=== ANALYSIS ===');
  console.log(`✓ Secrets sanitized: ${result.metadata.sanitizationStats.totalScrubbed}`);
  console.log(`✓ Compression ratio: ${result.metadata.compressionRatio.toFixed(2)}x`);
  console.log(`✓ Signal-to-Noise: ${(result.metadata.signalToNoiseRatio * 100).toFixed(1)}%`);
  console.log(`✓ Processing time: ${result.metadata.processingTimeMs}ms`);
};

const main = async () => {
  if (!command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'sanitize':
        await sanitizeCommand(args[1]);
        break;
      case 'entropy':
        await entropyCommand(args[1]);
        break;
      case 'refine':
        await refineCommand(args[1]);
        break;
      case 'batch':
        await batchCommand(args[1] || './src');
        break;
      case 'demo':
        await demoCommand();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

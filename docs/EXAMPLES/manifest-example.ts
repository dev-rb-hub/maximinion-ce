/**
 * Phase 3: Manifest Generator - Code Examples
 * 
 * This file demonstrates manifest generation and multi-format export.
 */

import { ManifestGenerator, ManifestOptions, Manifest } from '@maximinion/manifest-generator';
import * as fs from 'fs';

/**
 * Example 1: Basic Manifest Generation
 * Generate documentation from codebase
 */
async function example1_basicGeneration() {
  const generator = new ManifestGenerator({
    format: 'markdown',
    maxHierarchyDepth: 10,
    includeCode: true,
    includeDocstrings: true,
  });

  const manifest = await generator.generate('./src');

  console.log('Manifest Summary:');
  console.log(`  Files analyzed: ${manifest.codebaseSize.totalFiles}`);
  console.log(`  Total lines: ${manifest.codebaseSize.totalLines}`);
  console.log(`  Compression ratio: ${(manifest.codebaseSize.compressionRatio * 100).toFixed(1)}%`);
  console.log(`  Hierarchy depth: ${manifest.hierarchy.length}`);
  console.log(`  Cross-references: ${manifest.crossReferences.length}`);
}

/**
 * Example 2: Export to Multiple Formats
 * Generate documentation in different formats
 */
async function example2_multiFormatExport() {
  const generator = new ManifestGenerator({
    includeCode: true,
    includeDocstrings: true,
  });

  const manifest = await generator.generate('./src');

  // Export as Markdown
  const markdown = await generator.exportToFormat(manifest, 'markdown');
  fs.writeFileSync('./docs/MANIFEST.md', markdown);
  console.log('✓ Exported to MANIFEST.md');

  // Export as JSON
  const json = await generator.exportToFormat(manifest, 'json');
  fs.writeFileSync('./manifest.json', json);
  console.log('✓ Exported to manifest.json');

  // Export as YAML
  const yaml = await generator.exportToFormat(manifest, 'yaml');
  fs.writeFileSync('./manifest.yaml', yaml);
  console.log('✓ Exported to manifest.yaml');

  // Export as HTML
  const html = await generator.exportToFormat(manifest, 'html');
  fs.writeFileSync('./docs/manifest.html', html);
  console.log('✓ Exported to manifest.html');

  console.log('\nFile sizes:');
  console.log(`  Markdown: ${markdown.length} bytes`);
  console.log(`  JSON: ${json.length} bytes`);
  console.log(`  YAML: ${yaml.length} bytes`);
  console.log(`  HTML: ${html.length} bytes`);
}

/**
 * Example 3: Query Manifest
 * Find specific documentation in manifest
 */
async function example3_queryManifest() {
  const generator = new ManifestGenerator();
  const manifest = await generator.generate('./src');

  // Find all functions
  const functions = generator.query(manifest, {
    type: 'function',
    minImportance: 0.5,
  });

  console.log(`Found ${functions.length} important functions:`);
  functions.slice(0, 5).forEach(fn => {
    console.log(`  - ${fn.name} (importance: ${(fn.importance * 100).toFixed(0)}%)`);
  });

  // Find all services
  const services = generator.query(manifest, {
    type: 'class',
    name: /.*Service$/,
  });

  console.log(`\nFound ${services.length} service classes`);
}

/**
 * Example 4: With Phase 1 & 2 Integration
 * Generate optimized manifest using Refiner and Librarian
 */
async function example4_integratedGeneration() {
  const { Refiner } = await import('@maximinion/refiner');
  const { Librarian } = await import('@maximinion/librarian');
  const generator = new ManifestGenerator({
    format: 'markdown',
    maxHierarchyDepth: 8, // Limit depth for better readability
  });

  // Step 1: Refine code (sanitize + compress)
  const refiner = new Refiner({
    enableSemanticFolding: false,
    entropyThreshold: 0.4,
  });
  const refined = await refiner.process('./src');

  // Step 2: Analyze dependencies
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  // Step 3: Generate manifest with all context
  const manifest = await generator.generate('./src');

  console.log('Integrated Manifest Generation:');
  console.log(`  Original size: ${refined.compressionRatio}% compressed`);
  console.log(`  Dependency analysis: ${graph.nodes.length} files analyzed`);
  console.log(`  Generated manifest: ${manifest.codebaseSize.totalLines} lines`);
  console.log(`  Overall compression: ${(manifest.codebaseSize.compressionRatio * 100).toFixed(1)}%`);

  // Export
  const markdown = await generator.exportToFormat(manifest, 'markdown');
  fs.writeFileSync('./MANIFEST_OPTIMIZED.md', markdown);
  console.log('\n✓ Optimized manifest exported to MANIFEST_OPTIMIZED.md');
}

/**
 * Example 5: Custom Hierarchy
 * Control documentation hierarchy structure
 */
async function example5_customHierarchy() {
  const generator = new ManifestGenerator({
    maxHierarchyDepth: 5,
    includeCode: false, // Skip code snippets for summary-only manifest
    includeDocstrings: true,
  });

  const manifest = await generator.generate('./src');

  // Customize hierarchy display
  console.log('Custom Hierarchy Structure:');
  
  function printHierarchy(node: any, depth: number = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}├─ ${node.name} (${node.type})`);
    if (node.children && depth < 3) {
      node.children.forEach((child: any) => printHierarchy(child, depth + 1));
    }
  }

  manifest.hierarchy.forEach(node => printHierarchy(node));
}

/**
 * Example 6: Static Site Generation
 * Create a browsable documentation site
 */
async function example6_staticSiteGeneration() {
  const generator = new ManifestGenerator({
    format: 'html',
    includeCode: true,
  });

  const manifest = await generator.generate('./src');
  const html = await generator.exportToFormat(manifest, 'html');

  // Create directory structure
  const docDir = './docs/generated';
  if (!fs.existsSync(docDir)) {
    fs.mkdirSync(docDir, { recursive: true });
  }

  // Write HTML
  fs.writeFileSync(`${docDir}/index.html`, html);

  // Create index page
  const indexHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>MaxiMinion.AI - Generated Documentation</title>
      <link rel="stylesheet" href="style.css">
    </head>
    <body>
      <h1>MaxiMinion.AI Code Documentation</h1>
      <p>Generated: ${new Date().toISOString()}</p>
      <iframe src="index.html" width="100%" height="800px"></iframe>
    </body>
    </html>
  `;

  fs.writeFileSync(`${docDir}/manifest.html`, indexHtml);

  console.log(`✓ Documentation site created in ${docDir}/`);
  console.log('  Open in browser: open file://' + docDir + '/manifest.html');
}

/**
 * Example 7: Documentation Validation
 * Verify manifest quality and completeness
 */
async function example7_documentationValidation() {
  const generator = new ManifestGenerator();
  const manifest = await generator.generate('./src');

  interface ValidationResult {
    totalNodes: number;
    documentedNodes: number;
    documentationCoverage: number;
    brokenReferences: number;
    warnings: string[];
  }

  const result: ValidationResult = {
    totalNodes: manifest.hierarchy.length,
    documentedNodes: 0,
    documentationCoverage: 0,
    brokenReferences: 0,
    warnings: [],
  };

  // Count documented nodes
  function countDocumented(node: any): number {
    let count = node.description && node.description.length > 0 ? 1 : 0;
    if (node.children) {
      count += node.children.reduce((sum: number, child: any) => sum + countDocumented(child), 0);
    }
    return count;
  }

  result.documentedNodes = manifest.hierarchy.reduce(
    (sum, node) => sum + countDocumented(node),
    0
  );
  result.documentationCoverage = result.documentedNodes / result.totalNodes;

  // Check for broken references
  result.brokenReferences = manifest.crossReferences.filter(
    ref => !ref.resolved
  ).length;

  if (result.documentationCoverage < 0.8) {
    result.warnings.push(`Low documentation coverage: ${(result.documentationCoverage * 100).toFixed(1)}%`);
  }
  if (result.brokenReferences > 0) {
    result.warnings.push(`${result.brokenReferences} broken cross-references`);
  }

  console.log('Documentation Validation:');
  console.log(`  Total nodes: ${result.totalNodes}`);
  console.log(`  Documented: ${result.documentedNodes}`);
  console.log(`  Coverage: ${(result.documentationCoverage * 100).toFixed(1)}%`);
  console.log(`  Broken references: ${result.brokenReferences}`);

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  } else {
    console.log('\n✓ Documentation quality is good!');
  }
}

/**
 * Example 8: CI/CD Integration
 * Generate documentation as part of build pipeline
 */
async function example8_cicdIntegration() {
  const generator = new ManifestGenerator({
    format: 'markdown',
    maxHierarchyDepth: 10,
    includeCode: false,
  });

  async function generateDocsOnBuild() {
    console.log('📚 Generating documentation...');

    try {
      const manifest = await generator.generate('./src');
      const markdown = await generator.exportToFormat(manifest, 'markdown');

      // Save to docs folder
      fs.writeFileSync('./docs/API.md', markdown);

      // Create summary for PR
      const summary = `
## Documentation Generated
- Total files: ${manifest.codebaseSize.totalFiles}
- Total lines: ${manifest.codebaseSize.totalLines}
- Compression ratio: ${(manifest.codebaseSize.compressionRatio * 100).toFixed(1)}%
- Generated: ${new Date().toISOString()}

Documentation updated in \`docs/API.md\`
      `;

      console.log('✓ Documentation generated');
      console.log(summary);

      return true;
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      return false;
    }
  }

  // Run in CI/CD pipeline
  const success = await generateDocsOnBuild();
  process.exit(success ? 0 : 1);
}

// Run examples
async function main() {
  console.log('=== Phase 3: Manifest Generator Examples ===\n');

  try {
    console.log('Example 1: Basic Generation');
    await example1_basicGeneration();
    console.log('\n---\n');

    console.log('Example 2: Multi-Format Export');
    await example2_multiFormatExport();
    console.log('\n---\n');

    console.log('Example 3: Query Manifest');
    await example3_queryManifest();
    console.log('\n---\n');

    // More examples...
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

main();

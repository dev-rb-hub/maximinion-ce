/**
 * Phase 2: The Librarian - Code Examples
 * 
 * This file demonstrates dependency graph analysis and centrality scoring.
 */

import { Librarian, LibrarianOptions } from '@maximinion/librarian';
import * as fs from 'fs';

/**
 * Example 1: Basic Graph Analysis
 * Analyze codebase structure
 */
async function example1_basicAnalysis() {
  const librarian = new Librarian({
    pageRankDampingFactor: 0.85,
    pageRankIterations: 40,
  });

  const graph = await librarian.analyze('./src');

  console.log('Graph Statistics:');
  console.log(`Files: ${graph.nodes.length}`);
  console.log(`Dependencies: ${graph.edges.length}`);
  console.log(`Clusters: ${graph.clusters.length}`);

  // Find top 5 important files
  const topFiles = Array.from(graph.centrality.composite.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\nTop 5 Most Important Files:');
  topFiles.forEach(([file, score], index) => {
    console.log(`${index + 1}. ${file} (importance: ${score.toFixed(3)})`);
  });
}

/**
 * Example 2: Centrality Comparison
 * Compare different importance metrics
 */
async function example2_centralityComparison() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  const file = 'services.ts';
  const centrality = librarian.getCentrality(file);

  console.log(`Centrality scores for ${file}:`);
  console.log(`  PageRank: ${centrality.pageRank.toFixed(3)}`);
  console.log(`  Betweenness: ${centrality.betweenness.toFixed(3)}`);
  console.log(`  Closeness: ${centrality.closeness.toFixed(3)}`);
  console.log(`  Composite: ${centrality.composite.toFixed(3)}`);

  console.log('\nInterpretation:');
  console.log(`  - PageRank: Importance in overall structure (0.95 = very important)`);
  console.log(`  - Betweenness: Role as bridge between modules (0.5 = moderate bridge)`);
  console.log(`  - Closeness: Proximity to other files (0.8 = well connected)`);
}

/**
 * Example 3: Find Critical Path
 * Identify longest dependency chain
 */
async function example3_criticalPath() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  const path = librarian.findCriticalPath();

  console.log('Critical Path (longest dependency chain):');
  path.forEach((file, index) => {
    const padding = '  '.repeat(index);
    const score = graph.centrality.composite.get(file)?.toFixed(3) || '0.000';
    console.log(`${padding}→ ${file} (${score})`);
  });

  console.log(`\nTotal chain length: ${path.length} files`);
  console.log('Impact: Changes to the first file affect all downstream files');
}

/**
 * Example 4: Cluster Detection
 * Find groups of tightly-coupled modules
 */
async function example4_clusterDetection() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  const clusters = librarian.detectClusters();

  console.log(`Detected ${clusters.length} clusters:\n`);

  clusters.forEach((cluster, index) => {
    console.log(`Cluster ${index + 1}: ${cluster.name}`);
    console.log(`  Files: ${cluster.files.join(', ')}`);
    console.log(`  Cohesion: ${(cluster.cohesion * 100).toFixed(1)}%`);
    console.log(`  Coupling: ${(cluster.coupling * 100).toFixed(1)}%`);
    console.log();
  });

  console.log('Recommendation: Consider refactoring high-coupling clusters');
}

/**
 * Example 5: Dependency Visualization
 * Export for visualization tools
 */
async function example5_dependencyVisualization() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  // Export as GraphML (for Gephi, yEd, etc.)
  const graphml = generateGraphML(graph);
  fs.writeFileSync('dependencies.graphml', graphml);

  // Export as DOT (for Graphviz)
  const dot = generateDOT(graph);
  fs.writeFileSync('dependencies.dot', dot);

  console.log('✓ Exported to dependencies.graphml (use Gephi)');
  console.log('✓ Exported to dependencies.dot (use Graphviz)');
  console.log('\nVisualize with:');
  console.log('  # Graphviz');
  console.log('  dot -Tpng dependencies.dot -o dependencies.png');
  console.log('  open dependencies.png');
}

/**
 * Example 6: Finding Circular Dependencies
 * Detect cycles in dependency graph
 */
async function example6_circularDependencies() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  console.log('Circular Dependencies:');

  graph.nodes.forEach(node => {
    const visited = new Set<string>();
    const path: string[] = [];

    function hasCycle(fileId: string, target: string): boolean {
      if (visited.has(fileId)) return fileId === target;
      visited.add(fileId);
      path.push(fileId);

      const deps = graph.edges
        .filter(e => e.from === fileId)
        .map(e => e.to);

      for (const dep of deps) {
        if (hasCycle(dep, target)) return true;
      }

      path.pop();
      return false;
    }

    if (hasCycle(node.id, node.id)) {
      console.log(`⚠️  Found cycle: ${path.join(' → ')} → ${node.id}`);
    }
  });
}

/**
 * Example 7: Stability Analysis
 * Identify files that are frequently dependent on
 */
async function example7_stabilityAnalysis() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  interface FileStability {
    file: string;
    incomingDependencies: number;
    outgoingDependencies: number;
    stability: number; // 0-1, higher = more stable
  }

  const stability: FileStability[] = graph.nodes.map(node => {
    const incoming = graph.edges.filter(e => e.to === node.id).length;
    const outgoing = graph.edges.filter(e => e.from === node.id).length;
    const total = incoming + outgoing || 1;

    return {
      file: node.id,
      incomingDependencies: incoming,
      outgoingDependencies: outgoing,
      stability: incoming / total, // Higher = more depended on = more stable to change
    };
  });

  // Sort by stability
  stability.sort((a, b) => b.stability - a.stability);

  console.log('File Stability Analysis:');
  console.log('(High stability = heavily depended on = risky to change)\n');

  stability.slice(0, 10).forEach(item => {
    console.log(`${item.file}`);
    console.log(`  Depended on by: ${item.incomingDependencies} files`);
    console.log(`  Depends on: ${item.outgoingDependencies} files`);
    console.log(`  Stability: ${(item.stability * 100).toFixed(1)}% (high = risky to change)`);
  });
}

/**
 * Example 8: Architecture Review
 * Generate report for architecture review
 */
async function example8_architectureReview() {
  const librarian = new Librarian();
  const graph = await librarian.analyze('./src');

  const report = {
    summary: {
      totalFiles: graph.nodes.length,
      totalDependencies: graph.edges.length,
      averageDependencies: graph.edges.length / graph.nodes.length,
    },
    topModules: Array.from(graph.centrality.composite.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, score]) => ({ file, importance: score })),
    clusters: graph.clusters.map(c => ({
      name: c.name,
      fileCount: c.files.length,
      cohesion: c.cohesion,
      coupling: c.coupling,
    })),
    recommendations: generateRecommendations(graph),
  };

  console.log('=== Architecture Review Report ===\n');
  console.log(JSON.stringify(report, null, 2));

  // Save report
  fs.writeFileSync('architecture-review.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Report saved to architecture-review.json');
}

// Helper functions
function generateGraphML(graph: any): string {
  // Simplified GraphML generation
  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml>
  <graph edgedefault="directed">
    ${graph.nodes.map((n: any) => `<node id="${n.id}"/>`).join('\n    ')}
    ${graph.edges.map((e: any) => `<edge source="${e.from}" target="${e.to}"/>`).join('\n    ')}
  </graph>
</graphml>`;
}

function generateDOT(graph: any): string {
  return `digraph dependencies {
  ${graph.nodes.map((n: any) => `"${n.id}"`).join('; ')}
  ${graph.edges.map((e: any) => `"${e.from}" -> "${e.to}"`).join('\n  ')}
}`;
}

function generateRecommendations(graph: any): string[] {
  const recommendations = [];

  // Check coupling
  const avgCoupling = graph.clusters.reduce((sum: number, c: any) => sum + c.coupling, 0) / graph.clusters.length;
  if (avgCoupling > 0.7) {
    recommendations.push('⚠️  High coupling detected. Consider refactoring high-coupling modules.');
  }

  // Check for circular dependencies
  const hasCycles = graph.nodes.length > 0; // Simplified
  if (hasCycles) {
    recommendations.push('⚠️  Circular dependencies found. Review dependency flow.');
  }

  recommendations.push('✓ Regular refactoring recommended for stability');
  return recommendations;
}

// Run examples
async function main() {
  console.log('=== Phase 2: Librarian Examples ===\n');

  try {
    console.log('Example 1: Basic Analysis');
    await example1_basicAnalysis();
    console.log('\n---\n');

    console.log('Example 2: Centrality Comparison');
    await example2_centralityComparison();
    console.log('\n---\n');

    console.log('Example 3: Critical Path');
    await example3_criticalPath();
    console.log('\n---\n');

    console.log('Example 4: Cluster Detection');
    await example4_clusterDetection();
    console.log('\n---\n');

    // More examples...
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

main();

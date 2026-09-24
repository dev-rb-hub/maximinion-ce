/**
 * Manifest Compiler Module for Phase 3
 *
 * Compiles manifest output in various formats:
 * JSON, Markdown, HTML, and YAML.
 */

import { Manifest, ManifestNode, ManifestCluster } from './types';

export class ManifestCompiler {
  /**
   * Compile manifest to JSON format
   */
  toJSON(manifest: Manifest, pretty: boolean = true): string {
    if (pretty) {
      return JSON.stringify(manifest, null, 2);
    }
    return JSON.stringify(manifest);
  }

  /**
   * Compile manifest to Markdown format
   */
  toMarkdown(manifest: Manifest, nodeMap: Map<string, ManifestNode>): string {
    const lines: string[] = [];

    // Header
    lines.push('# Codebase Manifest');
    lines.push('');
    lines.push(`**Generated:** ${new Date(manifest.generatedAt).toISOString()}`);
    lines.push(`**Codebase:** ${manifest.rootPath}`);
    lines.push(`**Language:** ${manifest.language}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Files:** ${manifest.totalFiles}`);
    lines.push(`- **Total Nodes:** ${manifest.totalNodes}`);
    lines.push(`- **Total Lines:** ${manifest.totalLines.toLocaleString()}`);
    lines.push(`- **Average File Size:** ${Math.round(manifest.averageFileSize)} lines`);
    lines.push(`- **Average Complexity:** ${manifest.averageComplexity.toFixed(2)}`);
    lines.push(`- **Processing Time:** ${manifest.processingTimeMs}ms`);
    lines.push('');

    // Language Distribution
    if (Object.keys(manifest.languageDistribution).length > 0) {
      lines.push('## Language Distribution');
      lines.push('');
      for (const [lang, count] of Object.entries(manifest.languageDistribution)) {
        lines.push(`- ${lang}: ${count} files`);
      }
      lines.push('');
    }

    // Layers
    lines.push('## Hierarchy');
    lines.push('');
    for (const layer of manifest.layers) {
      lines.push(`### Layer ${layer.level}: ${layer.description}`);
      lines.push('');
      lines.push(`- **Nodes:** ${layer.nodes.length}`);
      lines.push(`- **Files:** ${layer.fileCount}`);
      lines.push(`- **Total Lines:** ${layer.totalLines.toLocaleString()}`);
      lines.push(`- **Average Complexity:** ${layer.averageComplexity.toFixed(2)}`);
      lines.push('');

      // List top nodes in this layer
      const topNodes = layer.nodes.sort((a, b) => b.importance - a.importance).slice(0, 5);
      if (topNodes.length > 0) {
        lines.push('**Top Nodes:**');
        lines.push('');
        for (const node of topNodes) {
          lines.push(`- \`${node.name}\` (${node.type}) - Importance: ${node.importance.toFixed(2)}`);
        }
        lines.push('');
      }
    }

    // Clusters
    if (manifest.clusters.length > 0) {
      lines.push('## Clusters');
      lines.push('');
      for (const cluster of manifest.clusters) {
        lines.push(`### ${cluster.name}`);
        lines.push('');
        lines.push(`- **Nodes:** ${cluster.nodeCount}`);
        lines.push(`- **Cohesion:** ${cluster.cohesion.toFixed(2)}`);
        lines.push(`- **Coupling:** ${cluster.coupling.toFixed(2)}`);
        lines.push(`- **Complexity:** ${cluster.complexity.toFixed(2)}`);
        lines.push('');

        if (cluster.description) {
          lines.push(`*${cluster.description}*`);
          lines.push('');
        }
      }
    }

    // Circular Dependencies
    if (manifest.circularDependencies.length > 0) {
      lines.push('## ⚠️ Circular Dependencies');
      lines.push('');
      for (let i = 0; i < Math.min(manifest.circularDependencies.length, 10); i++) {
        const cycle = manifest.circularDependencies[i];
        const cyclePath = cycle.map((r) => nodeMap.get(r.fromId)?.name || r.fromId).join(' → ');
        lines.push(`${i + 1}. ${cyclePath}`);
      }
      if (manifest.circularDependencies.length > 10) {
        lines.push(`... and ${manifest.circularDependencies.length - 10} more`);
      }
      lines.push('');
    }

    // Critical Paths
    if (manifest.criticalPaths.length > 0) {
      lines.push('## Critical Paths');
      lines.push('');
      lines.push(`**Longest Path:** ${manifest.longestPathLength} nodes`);
      lines.push('');

      const longestPathNames = manifest.longestPath
        .map((id) => nodeMap.get(id)?.name || id)
        .join(' → ');
      lines.push(`\`${longestPathNames}\``);
      lines.push('');

      lines.push('**Top 5 Critical Paths:**');
      lines.push('');
      for (let i = 0; i < Math.min(manifest.criticalPaths.length, 5); i++) {
        const path = manifest.criticalPaths[i];
        const pathNames = path.map((id) => nodeMap.get(id)?.name || id).join(' → ');
        lines.push(`${i + 1}. (${path.length} nodes) ${pathNames}`);
      }
      lines.push('');
    }

    // Top Level Modules
    if (manifest.topLevelModules.length > 0) {
      lines.push('## Top Level Modules');
      lines.push('');
      for (const moduleId of manifest.topLevelModules.slice(0, 20)) {
        const node = nodeMap.get(moduleId);
        if (node) {
          lines.push(`- **${node.name}** (${node.type})`);
          if (node.description) {
            lines.push(`  - ${node.description}`);
          }
          lines.push(`  - Importance: ${node.importance.toFixed(2)}`);
          lines.push(`  - Complexity: ${node.complexity.toFixed(2)}`);
          lines.push(`  - Lines: ${node.lineCount}`);
        }
      }
      lines.push('');
    }

    // Statistics
    lines.push('## Statistics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Nodes | ${manifest.totalNodes} |`);
    lines.push(`| Total Files | ${manifest.totalFiles} |`);
    lines.push(`| Total Lines | ${manifest.totalLines.toLocaleString()} |`);
    lines.push(`| Average Importance | ${(manifest.totalNodes > 0 ? manifest.topLevelModules.length / manifest.totalNodes : 0).toFixed(2)} |`);
    lines.push(`| Circular Dependencies | ${manifest.circularDependencies.length} |`);
    lines.push(`| Clusters | ${manifest.clusters.length} |`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Compile manifest to YAML format
   */
  toYAML(manifest: Manifest): string {
    const lines: string[] = [];

    lines.push('version: ' + manifest.version);
    lines.push('codebaseId: ' + manifest.codebaseId);
    lines.push('language: ' + manifest.language);
    lines.push('rootPath: ' + manifest.rootPath);
    lines.push('generatedAt: ' + new Date(manifest.generatedAt).toISOString());
    lines.push('');

    lines.push('metrics:');
    lines.push('  totalNodes: ' + manifest.totalNodes);
    lines.push('  totalFiles: ' + manifest.totalFiles);
    lines.push('  totalLines: ' + manifest.totalLines);
    lines.push('  averageFileSize: ' + manifest.averageFileSize.toFixed(2));
    lines.push('  averageComplexity: ' + manifest.averageComplexity.toFixed(2));
    lines.push('  processingTimeMs: ' + manifest.processingTimeMs);
    lines.push('');

    lines.push('layers:');
    for (const layer of manifest.layers) {
      lines.push('  - level: ' + layer.level);
      lines.push('    description: ' + layer.description);
      lines.push('    nodeCount: ' + layer.nodes.length);
      lines.push('    fileCount: ' + layer.fileCount);
      lines.push('    totalLines: ' + layer.totalLines);
      lines.push('    averageComplexity: ' + layer.averageComplexity.toFixed(2));
    }
    lines.push('');

    lines.push('circularDependencies: ' + manifest.circularDependencies.length);
    lines.push('clusters: ' + manifest.clusters.length);
    lines.push('longestPathLength: ' + manifest.longestPathLength);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Compile manifest to HTML format
   */
  toHTML(manifest: Manifest, nodeMap: Map<string, ManifestNode>): string {
    const markdown = this.toMarkdown(manifest, nodeMap);
    
    // Simple markdown-to-HTML conversion
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codebase Manifest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    h2 { color: #1a73e8; margin-top: 30px; }
    h3 { color: #5f6368; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f5f5f5; }
    ul, ol { margin: 10px 0; }
    li { margin: 5px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
`;

    html += this.markdownToHTML(markdown);

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Simple markdown to HTML converter
   */
  private markdownToHTML(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Code blocks
    html = html.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

    // Lists
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Tables
    html = html.replace(/\| (.*?) \|\n\|[-\s|]+\|\n/g, '<table>\n<tr><td>$1</td></tr>\n');

    return html;
  }

  /**
   * Get file extension for format
   */
  getFileExtension(format: 'json' | 'markdown' | 'html' | 'yaml'): string {
    const extensions: Record<string, string> = {
      json: 'json',
      markdown: 'md',
      html: 'html',
      yaml: 'yml',
    };
    return extensions[format] || 'txt';
  }
}

/**
 * Phase 2: The Librarian - Graph Builder
 * Constructs dependency graph from code files via AST-like analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  GraphNode,
  GraphEdge,
  DependencyGraph,
  GraphMetadata,
  ASTParseResult,
  CodeMetrics,
} from './types';

export class GraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private fileCache: Map<string, string> = new Map();

  /**
   * Build dependency graph from a directory or file
   */
  buildGraph(sourcePath: string, filePattern = '**/*.ts'): DependencyGraph {
    const startTime = Date.now();

    // Discover files
    const files = this.discoverFiles(sourcePath, filePattern);

    // Parse each file and extract nodes
    files.forEach((filePath) => {
      this.parseFile(filePath, sourcePath);
    });

    // Build edges from imports and references
    this.extractEdges();

    const endTime = Date.now();

    // Compute graph metadata
    const metadata = this.computeMetadata(startTime, endTime, files);

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      metadata,
    };
  }

  /**
   * Discover files matching pattern
   */
  private discoverFiles(sourcePath: string, pattern: string): string[] {
    const files: string[] = [];
    const baseDir = fs.statSync(sourcePath).isDirectory() ? sourcePath : path.dirname(sourcePath);

    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(fullPath);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              files.push(fullPath);
            }
          }
        });
      } catch (e) {
        // Skip directories we can't read
      }
    };

    walkDir(baseDir);
    return files;
  }

  /**
   * Parse a single file and extract code nodes
   */
  private parseFile(filePath: string, basePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.fileCache.set(filePath, content);

      const relPath = path.relative(basePath, filePath);
      const parseResult = this.parseTypeScriptFile(content, filePath, relPath);

      parseResult.nodes.forEach((node) => {
        this.nodes.set(node.id, node);
      });
    } catch (e) {
      // Skip files that can't be parsed
    }
  }

  /**
   * Parse TypeScript/JavaScript file (basic regex-based approach)
   */
  private parseTypeScriptFile(
    content: string,
    filePath: string,
    relPath: string
  ): ASTParseResult {
    const nodes: GraphNode[] = [];
    const imports: Array<{ from: string; to: string; type: string }> = [];
    const lines = content.split('\n');

    // Extract imports
    const importRegex = /^import\s+(?:{[^}]*}|\w+|.*?)\s+from\s+['"](.*?)['"];?$/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        from: relPath,
        to: match[1],
        type: 'import',
      });
    }

    // Extract functions
    const funcRegex = /^(?:async\s+)?(?:export\s+)?function\s+(\w+)\s*\(/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length - 1;
      nodes.push(
        this.createNode(
          `${relPath}:function:${match[1]}`,
          match[1],
          'function',
          filePath,
          lineNum,
          this.extractFunctionBody(content, match.index)
        )
      );
    }

    // Extract classes
    const classRegex = /^(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length - 1;
      nodes.push(
        this.createNode(
          `${relPath}:class:${match[1]}`,
          match[1],
          'class',
          filePath,
          lineNum,
          this.extractClassBody(content, match.index)
        )
      );
    }

    // Add file-level node
    const metrics: CodeMetrics = {
      lineCount: lines.length,
      complexity: this.estimateComplexity(content),
      dependencies: imports.length,
      referencedBy: 0,
      tokenCount: Math.ceil(lines.join('\n').split(/\s+/).length * 1.3),
    };

    nodes.push({
      id: `file:${relPath}`,
      name: path.basename(filePath),
      type: 'file',
      filePath,
      startLine: 0,
      endLine: lines.length,
      codeSnippet: content.substring(0, Math.min(500, content.length)),
      metrics,
      metadata: { imports: imports.length, language: 'typescript' },
    });

    return {
      nodes,
      imports,
      language: 'typescript',
    };
  }

  /**
   * Extract function body for code snippet
   */
  private extractFunctionBody(content: string, startIndex: number): string {
    const braceStart = content.indexOf('{', startIndex);
    if (braceStart === -1) return '';

    let braceCount = 0;
    let endIndex = braceStart;

    for (let i = braceStart; i < content.length && i < braceStart + 500; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    return content.substring(braceStart, Math.min(endIndex + 1, braceStart + 500));
  }

  /**
   * Extract class body for code snippet
   */
  private extractClassBody(content: string, startIndex: number): string {
    return this.extractFunctionBody(content, startIndex);
  }

  /**
   * Estimate cyclomatic complexity from code
   */
  private estimateComplexity(content: string): number {
    const complexityKeywords = ['if', 'else', 'case', 'for', 'while', 'catch', '?', '&&', '||'];
    let complexity = 1;

    complexityKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      complexity += (matches?.length || 0) * 0.5;
    });

    return Math.min(Math.round(complexity), 10);
  }

  /**
   * Create a graph node
   */
  private createNode(
    id: string,
    name: string,
    type: 'file' | 'function' | 'class' | 'method' | 'variable' | 'module',
    filePath: string,
    startLine: number,
    codeSnippet: string
  ): GraphNode {
    const lineCount = codeSnippet.split('\n').length;

    return {
      id,
      name,
      type,
      filePath,
      startLine,
      endLine: startLine + lineCount,
      codeSnippet,
      metrics: {
        lineCount,
        complexity: this.estimateComplexity(codeSnippet),
        dependencies: 0,
        referencedBy: 0,
        tokenCount: Math.ceil(codeSnippet.split(/\s+/).length * 1.3),
      },
      metadata: { language: 'typescript' },
    };
  }

  /**
   * Extract edges from imports and cross-references
   */
  private extractEdges(): void {
    // For now, we'll create edges based on file dependencies
    this.nodes.forEach((node) => {
      if (node.type === 'file') {
        const imports = (node.metadata.imports as number) || 0;
        // Simple heuristic: each import creates a weighted edge
        if (imports > 0) {
          // Placeholder for actual import resolution
        }
      }
    });

    // Add basic edges
    this.nodes.forEach((sourceNode) => {
      this.nodes.forEach((targetNode) => {
        if (sourceNode.id !== targetNode.id && this.isDependent(sourceNode, targetNode)) {
          this.edges.push({
            source: sourceNode.id,
            target: targetNode.id,
            type: 'reference',
            weight: 0.5,
          });
        }
      });
    });
  }

  /**
   * Determine if sourceNode depends on targetNode
   */
  private isDependent(source: GraphNode, target: GraphNode): boolean {
    // Simple heuristic: same file or name reference
    if (source.filePath === target.filePath) return false;
    if (source.type === 'file' && target.type === 'file') return false;

    return source.codeSnippet.includes(target.name);
  }

  /**
   * Compute graph metadata
   */
  private computeMetadata(
    startTime: number,
    endTime: number,
    files: string[]
  ): GraphMetadata {
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.length;
    const possibleEdges = totalNodes * (totalNodes - 1);
    const density = possibleEdges > 0 ? totalEdges / possibleEdges : 0;

    let totalLines = 0;
    this.nodes.forEach((node) => {
      totalLines += node.metrics.lineCount;
    });

    // Count connected components using simple DFS
    const visited = new Set<string>();
    let components = 0;

    this.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        this.dfsComponent(node.id, visited);
        components++;
      }
    });

    return {
      totalNodes,
      totalEdges,
      averageDegree: totalNodes > 0 ? (totalEdges * 2) / totalNodes : 0,
      density,
      connectedComponents: components,
      processingTimeMs: endTime - startTime,
      codebaseSize: totalLines,
    };
  }

  /**
   * DFS for finding connected components
   */
  private dfsComponent(nodeId: string, visited: Set<string>): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    this.edges.forEach((edge) => {
      if (edge.source === nodeId) {
        this.dfsComponent(edge.target, visited);
      } else if (edge.target === nodeId) {
        this.dfsComponent(edge.source, visited);
      }
    });
  }

  /**
   * Clear builder state
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.fileCache.clear();
  }
}

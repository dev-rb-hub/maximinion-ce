/**
 * Cross-Reference Resolver Module for Phase 3
 *
 * Resolves and validates cross-references between nodes,
 * detects circular dependencies, and builds dependency graphs.
 */

import { ManifestNode, CrossReference } from './types';

export class CrossReferenceResolver {
  /**
   * Resolve all cross-references and validate them
   */
  resolveReferences(nodes: ManifestNode[]): CrossReference[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const resolved: CrossReference[] = [];

    for (const node of nodes) {
      for (const imported of node.imports) {
        const target = nodeMap.get(imported.toId);
        if (target) {
          resolved.push({
            fromId: node.id,
            toId: target.id,
            type: imported.type,
            strength: imported.strength,
            isCircular: false,
            context: imported.context,
          });
        }
      }
    }

    return resolved;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircularDependencies(nodes: ManifestNode[], references: CrossReference[]): CrossReference[][] {
    const circularDeps: CrossReference[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const buildAdjacency = () => {
      const adj = new Map<string, string[]>();
      for (const node of nodes) {
        adj.set(node.id, []);
      }

      for (const ref of references) {
        if (adj.has(ref.fromId) && adj.has(ref.toId)) {
          adj.get(ref.fromId)!.push(ref.toId);
        }
      }

      return adj;
    };

    const adjacency = buildAdjacency();

    const dfs = (nodeId: string, path: string[]): CrossReference[][] => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const cycles: CrossReference[][] = [];
      const neighbors = adjacency.get(nodeId) || [];

      for (const neighbor of neighbors) {
        if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cyclePath = path.slice(cycleStart).concat(neighbor);
          const cycleRefs = this.pathToReferences(cyclePath, references);
          cycles.push(cycleRefs);
        } else if (!visited.has(neighbor)) {
          const nested = dfs(neighbor, [...path]);
          cycles.push(...nested);
        }
      }

      recursionStack.delete(nodeId);
      return cycles;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const cycles = dfs(node.id, []);
        circularDeps.push(...cycles);
      }
    }

    // Mark circular references
    const circularIds = new Set<string>();
    for (const cycle of circularDeps) {
      for (const ref of cycle) {
        circularIds.add(`${ref.fromId}->${ref.toId}`);
      }
    }

    for (const ref of references) {
      if (circularIds.has(`${ref.fromId}->${ref.toId}`)) {
        ref.isCircular = true;
      }
    }

    return circularDeps;
  }

  /**
   * Compute critical paths (longest dependency chains)
   */
  computeCriticalPaths(nodes: ManifestNode[], references: CrossReference[]): string[][] {
    const buildAdjacency = () => {
      const adj = new Map<string, string[]>();
      for (const node of nodes) {
        adj.set(node.id, []);
      }

      for (const ref of references) {
        if (!ref.isCircular && adj.has(ref.toId) && adj.has(ref.fromId)) {
          adj.get(ref.fromId)!.push(ref.toId);
        }
      }

      return adj;
    };

    const adjacency = buildAdjacency();
    const paths: string[][] = [];
    const memoization = new Map<string, string[][]>();

    const dfs = (nodeId: string): string[][] => {
      if (memoization.has(nodeId)) {
        return memoization.get(nodeId)!;
      }

      const neighbors = adjacency.get(nodeId) || [];

      if (neighbors.length === 0) {
        return [[nodeId]];
      }

      const localPaths: string[][] = [];

      for (const neighbor of neighbors) {
        const subPaths = dfs(neighbor);
        for (const subPath of subPaths) {
          localPaths.push([nodeId, ...subPath]);
        }
      }

      memoization.set(nodeId, localPaths);
      return localPaths;
    };

    // Find paths from all nodes
    for (const node of nodes) {
      const nodePaths = dfs(node.id);
      paths.push(...nodePaths);
    }

    // Sort by length and return top critical paths
    return paths.sort((a, b) => b.length - a.length).slice(0, 10);
  }

  /**
   * Find the longest dependency chain
   */
  findLongestPath(nodes: ManifestNode[], references: CrossReference[]): string[] {
    const criticalPaths = this.computeCriticalPaths(nodes, references);
    return criticalPaths.length > 0 ? criticalPaths[0] : [];
  }

  /**
   * Check if a path contains a cycle
   */
  hasCircle(nodeId: string, target: string, visited: Set<string>, adjacency: Map<string, string[]>): boolean {
    if (nodeId === target) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    const neighbors = adjacency.get(nodeId) || [];

    for (const neighbor of neighbors) {
      if (this.hasCircle(neighbor, target, visited, adjacency)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get reference strength between two nodes
   * Based on number of references and their types
   */
  calculateReferenceStrength(
    fromId: string,
    toId: string,
    references: CrossReference[],
  ): number {
    const directRefs = references.filter((r) => r.fromId === fromId && r.toId === toId);

    if (directRefs.length === 0) return 0;

    // Weight by reference type
    let strength = 0;
    for (const ref of directRefs) {
      switch (ref.type) {
        case 'extends':
        case 'implements':
          strength += 0.5;
          break;
        case 'import':
          strength += 0.3;
          break;
        case 'uses':
        case 'references':
          strength += 0.2;
          break;
      }
    }

    // Normalize to 0-1
    return Math.min(strength, 1);
  }

  /**
   * Get all dependencies of a node (transitive closure)
   */
  getTransitiveDependencies(nodeId: string, references: CrossReference[]): Set<string> {
    const deps = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);

      for (const ref of references) {
        if (ref.fromId === current && !ref.isCircular) {
          if (!visited.has(ref.toId)) {
            deps.add(ref.toId);
            queue.push(ref.toId);
          }
        }
      }
    }

    return deps;
  }

  /**
   * Get all dependents of a node (reverse transitive closure)
   */
  getTransitiveDependents(nodeId: string, references: CrossReference[]): Set<string> {
    const dependents = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);

      for (const ref of references) {
        if (ref.toId === current && !ref.isCircular) {
          if (!visited.has(ref.fromId)) {
            dependents.add(ref.fromId);
            queue.push(ref.fromId);
          }
        }
      }
    }

    return dependents;
  }

  /**
   * Convert path (array of node IDs) to references
   */
  private pathToReferences(path: string[], references: CrossReference[]): CrossReference[] {
    const pathRefs: CrossReference[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      const ref = references.find((r) => r.fromId === from && r.toId === to);
      if (ref) {
        pathRefs.push(ref);
      }
    }

    return pathRefs;
  }

  /**
   * Find all paths between two nodes
   */
  findPaths(start: string, end: string, references: CrossReference[], maxDepth: number = 5): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const buildAdjacency = () => {
      const adj = new Map<string, string[]>();
      const allNodes = new Set<string>();

      for (const ref of references) {
        allNodes.add(ref.fromId);
        allNodes.add(ref.toId);
      }

      for (const node of allNodes) {
        adj.set(node, []);
      }

      for (const ref of references) {
        adj.get(ref.fromId)!.push(ref.toId);
      }

      return adj;
    };

    const adjacency = buildAdjacency();

    const dfs = (current: string, target: string, path: string[], depth: number): void => {
      if (depth > maxDepth) return;
      if (current === target) {
        paths.push([...path, current]);
        return;
      }

      if (visited.has(current)) return;
      visited.add(current);

      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, target, [...path, current], depth + 1);
      }

      visited.delete(current);
    };

    dfs(start, end, [], 0);
    return paths;
  }
}

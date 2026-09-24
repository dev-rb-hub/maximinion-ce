# Contributing to MaxiMinion.AI

Thank you for your interest in contributing to MaxiMinion.AI! This document provides guidelines for participating in the project, whether through code, documentation, bug reports, or feature suggestions.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contribution Guidelines](#contribution-guidelines)
5. [Commit Message Standards](#commit-message-standards)
6. [Testing Requirements](#testing-requirements)
7. [Documentation](#documentation)
8. [Review Process](#review-process)
9. [Community & Support](#community--support)

---

## Code of Conduct

MaxiMinion.AI is committed to fostering an inclusive, welcoming community. All contributors are expected to:

- **Be respectful:** Value diverse perspectives and backgrounds
- **Be collaborative:** Work constructively with other contributors
- **Be professional:** Maintain professional language in all interactions
- **Report issues:** Use the GitHub Issues system for bugs and concerns
- **Respect IP:** Only contribute code you have rights to contribute

Any violations of this conduct will be addressed promptly by project maintainers.

---

## Getting Started

### Prerequisites

- **Node.js:** v18+ (LTS recommended)
- **npm:** v9+ (comes with Node.js)
- **Git:** v2.30+ for version control
- **TypeScript:** v5.3 (installed as dev dependency)
- **VS Code:** Optional but recommended (with TypeScript extension)

### Fork & Clone

```bash
# 1. Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/maximinion.ai.git
cd maximinion.ai

# 2. Add upstream remote
git remote add upstream https://github.com/maximinion/maximinion.ai.git

# 3. Verify remotes
git remote -v
# origin    https://github.com/YOUR_USERNAME/maximinion.ai.git (fetch/pull)
# upstream  https://github.com/maximinion/maximinion.ai.git (fetch)
```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all packages via npm workspaces.

### 2. Build All Packages

```bash
npm run build
```

Compiles TypeScript across all packages:
- `packages/refiner`
- `packages/librarian`
- `packages/manifest-generator`
- `packages/proxy-transport`

### 3. Run Tests

```bash
npm test
```

Runs Jest test suites for all packages. Each package must maintain **≥75% code coverage**.

### 4. Watch Mode (Development)

```bash
npm run build -- --watch
```

Watches for changes and recompiles automatically.

---

## Contribution Guidelines

### Areas for Contribution

#### 1. **Phase Implementation & Enhancement**

- **Phase 1 (Refiner):** Secret patterns, entropy algorithms, compression techniques
- **Phase 2 (Librarian):** Graph algorithms, centrality metrics, ranking strategies
- **Phase 3 (Manifest):** Format exporters, hierarchy builders, reference resolvers
- **Phase 4 (Proxy Transport):** IDE adapters, caching strategies, streaming protocols

**How to Contribute:**
1. Pick an issue or create a new one
2. Discuss approach in the issue
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Implement with tests (see [Testing Requirements](#testing-requirements))
5. Submit a pull request

#### 2. **Bug Fixes**

All bug reports should include:
- Minimal reproduction case
- Expected vs. actual behavior
- Environment (Node version, OS, etc.)

**Fix Process:**
1. Create issue with `bug` label
2. Branch from main: `git checkout -b fix/bug-description`
3. Write failing test first (TDD)
4. Fix the bug to make test pass
5. Submit PR with issue reference

#### 3. **Documentation**

- **Architecture:** Update [ARCHITECTURE.md](./ARCHITECTURE.md) with diagrams
- **Phase Docs:** Enhance [PHASE_*.md](./PHASE_1.md) files
- **README:** Keep [README.md](./README.md) current
- **Type Definitions:** Document complex types with JSDoc
- **Examples:** Add usage examples in phase docs

**Documentation Quality:**
- Clear, concise language
- Code examples with syntax highlighting
- Mermaid diagrams for architecture
- Cross-links to related sections

#### 4. **Testing & Quality**

- Add unit tests for new features (mock data required)
- Improve test coverage
- Fix flaky tests
- Add integration tests
- Document test patterns

**Coverage Requirements:**
```
statements: 75%
branches: 75%
functions: 75%
lines: 75%
```

#### 5. **Language & Parser Support**

The system currently supports TypeScript/JavaScript. To add support for new languages:

1. **Implement Parser Interface:**
   ```typescript
   interface LanguageParser {
     parseFile(path: string, content: string): Entity[];
     extractImports(content: string): ImportEdge[];
     estimateComplexity(ast: AST): number;
   }
   ```

2. **Register Parser:**
   ```typescript
   librarian.registerParser('python', new PythonParser());
   ```

3. **Add Tests:**
   - Parse sample files
   - Verify import extraction
   - Validate complexity scoring

#### 6. **IDE Adapter Development**

New IDE support requires implementing `IDEAdapter` interface:

```typescript
interface IDEAdapter {
  name: string;
  version: string;
  capabilities: string[];
  
  getActiveFile(): Promise<string | null>;
  showMessage(message: string, type: 'info' | 'warning' | 'error'): Promise<void>;
  openFile(path: string, line?: number, column?: number): Promise<void>;
  // ... other methods
}
```

**Current Adapters:**
- VS Code (complete)
- JetBrains (stub)
- Mock (testing)

**To Add New IDE:**
1. Create `src/core/proxy-transport/{ide}-adapter.ts`
2. Implement all interface methods
3. Add tests in `/tests/{ide}-adapter.test.ts`
4. Document adapter capabilities

---

## Commit Message Standards

All commits must follow the **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Required. One of:
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation
- **style:** Code style (no logic change)
- **refactor:** Code refactor (no feature change)
- **perf:** Performance improvement
- **test:** Test addition/modification
- **chore:** Build/tooling/dependencies

### Scope

Optional. Package or module:
- `refiner`
- `librarian`
- `manifest-generator`
- `proxy-transport`

### Subject

- Imperative mood ("add", not "added")
- No period at end
- Max 50 characters
- Lowercase first letter

### Body

Optional. Explain what and why (not how):
- Wrap at 72 characters
- Separate from subject with blank line
- Use bullet points for multiple points

### Footer

Optional. Reference issues:
- `Fixes #123` - Closes issue
- `Refs #456` - Related to issue

### Examples

```
feat(refiner): add custom sanitization pattern API

Allow users to register custom secret patterns via
Refiner.addCustomSanitizationPattern(). This enables
detection of proprietary secret formats.

Fixes #42
Refs #38
```

```
fix(librarian): handle empty graph correctly

Previously, calculateCentralities() failed with empty
graph. Now returns normalized empty scores.

Fixes #45
```

---

## Testing Requirements

### Test Structure

Each package must have:
- `tests/` directory (not `__tests__` or `test/`)
- Test files: `{module}.test.ts` (not `.spec.ts`)
- Mock data in tests (not external fixtures)

### Writing Tests

**Pattern:**
```typescript
describe('Module Name', () => {
  // Setup
  let service: ServiceClass;
  
  beforeEach(() => {
    service = new ServiceClass();
  });
  
  // Group related tests
  describe('Feature Group', () => {
    test('should do something', () => {
      // Arrange
      const input = { /* mock data */ };
      
      // Act
      const result = service.method(input);
      
      // Assert
      expect(result).toEqual({ /* expected */ });
    });
  });
});
```

### Coverage Thresholds

**Global (all packages):**
- Statements: 75%
- Branches: 75%
- Functions: 75%
- Lines: 75%

**Per-Package:**
- Same thresholds enforced by jest.config.js

### Running Tests

```bash
# Run all tests
npm test

# Run specific package
npm test --workspace @maximinion/refiner

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=refiner.test.ts

# Watch mode
npm test -- --watch
```

### Test Data Guidelines

**DO:**
- Use minimal, focused mock data
- Create fixtures in `beforeEach`
- Use descriptive variable names
- Test both happy path and edge cases
- Mock external dependencies (Ollama, APIs)

**DON'T:**
- Use real files or network calls
- Create large fixture files
- Skip tests with `.skip`
- Use `setTimeout` for async testing (use async/await)
- Leave console.log in tests (except debugging)

---

## Documentation

### README Updates

- Keep overview current
- Add new features to feature list
- Update package stats (test count, dependencies)
- Link to ARCHITECTURE and phase docs

### PHASE_N.md Updates

Each phase document should include:
1. **Overview** - Purpose and goals
2. **Architecture** - Component diagram
3. **API Reference** - Exported functions and types
4. **Examples** - Usage code samples
5. **Performance** - Benchmarks and characteristics
6. **Future Enhancements** - Planned improvements

### ARCHITECTURE.md Updates

- Add new component diagrams (Mermaid)
- Update data flow diagrams
- Document new algorithms
- Add deployment patterns

### Type Documentation

Use JSDoc for complex types:

```typescript
/**
 * Represents context selection result
 * 
 * @property nodes - Selected nodes by importance
 * @property references - Cross-references between nodes
 * @property estimatedTokens - Total token count
 * @property compressionRatio - Original to optimized size ratio
 * 
 * @example
 * const result = await contextManager.queryContext(sessionId, query);
 * console.log(`Selected ${result.selectedCount} nodes`);
 */
interface ContextResult {
  nodes: ManifestNode[];
  references: CrossReference[];
  estimatedTokens: number;
  compressionRatio: number;
}
```

---

## Review Process

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Fork is up-to-date: `git fetch upstream && git rebase upstream/main`
- [ ] Branch name follows convention: `feature/xyz` or `fix/abc`
- [ ] All tests pass: `npm test`
- [ ] Coverage maintained: ≥75%
- [ ] Code builds: `npm run build`
- [ ] Commit messages follow standards
- [ ] Documentation updated if needed
- [ ] No console.log or debugging code
- [ ] No large files (>1MB)

### PR Title Format

```
<type>(<scope>): <description>
```

Example: `feat(proxy-transport): add LFU cache eviction policy`

### PR Description Template

```markdown
## Description
Brief explanation of changes

## Related Issues
Fixes #123
Refs #456

## Changes
- [ ] Feature implementation
- [ ] Unit tests
- [ ] Documentation

## Testing
How to test the changes:
1. ...
2. ...

## Screenshots/Diagrams
(if applicable)
```

### Review Expectations

**Reviewers will check:**
- Code quality and style consistency
- Test coverage and correctness
- Documentation clarity
- Performance impact
- Security implications
- Backward compatibility

**Average Review Time:** 2-5 days

**Approval Criteria:**
- At least one maintainer approval
- All CI checks passing
- Discussions resolved

---

## Community & Support

### Getting Help

- **Questions:** Use GitHub Discussions
- **Bugs:** Open GitHub Issues with `bug` label
- **Features:** Open GitHub Issues with `enhancement` label
- **Documentation:** Check [ARCHITECTURE.md](./ARCHITECTURE.md) and phase docs

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and community discussion
- **Pull Requests:** Code review and implementation discussion

### Maintainers

Current maintainers responsible for review and merge:
- @maximinion-core (Project Lead)

### Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Recognized in git commit history

---

## Development Workflow Example

```bash
# 1. Create feature branch
git checkout -b feature/add-python-parser

# 2. Make changes
# ... edit files ...

# 3. Run tests (must pass)
npm test

# 4. Build (must compile)
npm run build

# 5. Commit with proper message
git add -A
git commit -m "feat(librarian): add Python language parser support

- Implement PythonParser with AST analysis
- Extract imports and function definitions
- Estimate complexity for Python code
- Add 8 unit tests with 85% coverage

Fixes #67"

# 6. Push to fork
git push origin feature/add-python-parser

# 7. Create Pull Request on GitHub
# - Title: "feat(librarian): add Python language parser support"
# - Link to issue #67
# - Describe testing approach
# - Mention any breaking changes (none)

# 8. Address review feedback (if any)
# ... make changes ...
git add -A
git commit -m "fix: address review feedback - improve error handling"
git push origin feature/add-python-parser

# 9. After merge
git checkout main
git fetch upstream
git rebase upstream/main
git branch -d feature/add-python-parser
```

---

## Advanced Topics

### Building Custom Plugins

MaxiMinion.AI is extensible. To build a plugin:

1. **Register Custom Sanitizer:**
   ```typescript
   refiner.addCustomSanitizationPattern('CUSTOM', /pattern/g);
   ```

2. **Register Language Parser:**
   ```typescript
   librarian.registerParser('python', new PythonParser());
   ```

3. **Register IDE Adapter:**
   ```typescript
   proxy.setIDEAdapter(new CustomIDEAdapter());
   ```

4. **Register Export Format:**
   ```typescript
   compiler.registerFormat('custom', customExporter);
   ```

### Performance Profiling

To profile a phase:

```bash
# With Node.js built-in profiler
node --prof ./dist/core/phase-name/index.js

# Analyze
node --prof-process isolate-*.log > profile.txt
```

### Debugging in VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-coverage"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## FAQ

**Q: How long does review take?**  
A: Usually 2-5 days, depending on complexity.

**Q: Can I work on unreported issues?**  
A: Please open an issue first and wait for acknowledgment to avoid conflicts.

**Q: Do I need to sign a CLA?**  
A: Not currently, but this may change. Watch for announcements.

**Q: What's the release schedule?**  
A: Releases follow semantic versioning. Feature releases typically monthly.

**Q: Can I be a maintainer?**  
A: Yes! Demonstrate sustained, high-quality contributions, and we'll discuss it.

---

## Thank You! 🙏

Your contributions make MaxiMinion.AI better for everyone. We appreciate:
- Code contributions
- Bug reports
- Feature suggestions
- Documentation improvements
- Community support

Happy contributing!

# Local Development Setup

This guide walks through setting up your local MaxiMinion.AI development environment.

## Prerequisites

- **Node.js:** 18+ (18.16.0 or higher recommended)
- **npm:** 9+ (comes with Node.js)
- **Git:** 2.30+
- **TypeScript:** 5.3+ (installed via npm)
- **Optional: Ollama** - For semantic folding (Phase 1)

## Step 1: Clone the Repository

```bash
git clone https://github.com/maximinion/maximinion.ai
cd maximinion.ai
```

## Step 2: Install Dependencies

```bash
# Install all dependencies across monorepo
npm install

# Verify installation
npm --version  # Should be 9+
node --version # Should be 18+
```

## Step 3: Build All Packages

```bash
# Build all 4 packages
npm run build

# Output: packages/refiner, packages/librarian, packages/manifest-generator, packages/proxy-transport
```

## Step 4: Run Tests

```bash
# Run all tests (should see 106/106 passing)
npm test

# Run tests for specific package
npm test --workspace=@maximinion/refiner
npm test --workspace=@maximinion/librarian
npm test --workspace=@maximinion/manifest-generator
npm test --workspace=@maximinion/proxy-transport

# Run with coverage
npm test -- --coverage
```

## Step 5: Verify CLI Tools

```bash
# Test Phase 1: The Refiner
npx @maximinion/refiner --help

# Test Phase 2: The Librarian
npx @maximinion/librarian --help

# Test Phase 3: Manifest Generator
npx @maximinion/manifest-generator --help

# Test Phase 4: Proxy Transport
npx @maximinion/proxy-transport --help
```

## Optional: Semantic Folding with Ollama

If you want to test Phase 1's semantic folding:

```bash
# 1. Install Ollama: https://ollama.ai
# 2. Pull a model (e.g., mistral)
ollama pull mistral

# 3. Start Ollama
ollama serve

# 4. Test refiner with semantic folding
npx @maximinion/refiner --input ./src --enable-semantic-folding --ollama-model mistral
```

## Development Workflow

### Editing Source Code

```
packages/
├── refiner/src/              # Phase 1 source
├── librarian/src/            # Phase 2 source
├── manifest-generator/src/   # Phase 3 source
└── proxy-transport/src/      # Phase 4 source
```

### Rebuilding During Development

```bash
# Rebuild only changed packages
npm run build

# Or rebuild specific package
npm run build --workspace=@maximinion/refiner
```

### Running Tests During Development

```bash
# Watch mode (re-run on file changes)
npm test -- --watch

# For specific package
npm test --workspace=@maximinion/refiner -- --watch
```

## Debugging

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Debugging CLI Commands

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Or use VS Code debugger (F5) after adding config above
```

## Common Issues

### Issue: "npm ERR! Cannot find module '@maximinion/refiner'"

**Solution:** Run `npm install` again, ensure workspaces are recognized:

```bash
npm install
npm run build
```

### Issue: Tests failing with "Cannot find tsconfig"

**Solution:** Ensure root `tsconfig.json` is present:

```bash
ls tsconfig.base.json  # Should exist
npm run build          # Rebuild
npm test              # Re-run tests
```

### Issue: Port 3000 already in use (Proxy Transport)

**Solution:** Use a different port:

```bash
npx @maximinion/proxy-transport --port 3001
```

## VS Code Extensions (Recommended)

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Jest Runner** - Test running UI
- **TypeScript Vue Plugin** - If using Vue

## Next Steps

- Read [PHASE_1.md](../PHASE_1.md) to understand code sanitization
- Check [PHASE_2.md](../PHASE_2.md) for dependency analysis
- See [PHASE_3.md](../PHASE_3.md) for manifest generation
- Try [PHASE_4.md](../PHASE_4.md) for IDE integration
- Contribute! See [CONTRIBUTORS.md](../../CONTRIBUTORS.md)

---

**Need Help?** Open a [GitHub Issue](https://github.com/maximinion/maximinion.ai/issues) or ask in [Discussions](https://github.com/maximinion/maximinion.ai/discussions)

# Contributing to AI Writer for VS Code

Thank you for your interest in contributing to AI Writer! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- VS Code 1.95.0 or higher
- Git

### Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-writer-for-vscode.git
   cd ai-writer-for-vscode
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build the project:
   ```bash
   pnpm run build
   ```

5. Run tests to ensure everything works:
   ```bash
   pnpm run test
   ```

## Project Structure

```
.
├── .kiro/                  # Kiro-style specifications
│   ├── specs/             # Feature specifications
│   └── steering/          # Project context and guidelines
├── packages/
│   ├── base/              # Core business logic
│   ├── vscode-ext/        # VS Code extension
│   └── lmtapi-vscode/     # Language Model Tool API bridge
├── tests/                 # Integration tests
└── package.json           # Root package manifest
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards below

3. Run tests frequently:
   ```bash
   pnpm run test
   ```

4. Build to check for TypeScript errors:
   ```bash
   pnpm run build
   ```

5. Lint your code:
   ```bash
   pnpm run lint
   ```

### Committing Changes

We follow conventional commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Build process or auxiliary tool changes

Example:
```bash
git commit -m "feat: add webview for progress tracking"
git commit -m "fix: handle missing template in orchestrator"
git commit -m "docs: update README with new commands"
```

### Submitting Pull Requests

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Ensure your PR:
   - Has a clear title and description
   - References any related issues
   - Includes tests for new functionality
   - Passes all CI checks
   - Follows the coding standards

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer `readonly` for immutable data
- Use explicit return types for public APIs
- Avoid `any` - use `unknown` if type is truly unknown
- Use functional programming patterns where appropriate

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline arrays/objects
- Keep lines under 100 characters when reasonable
- Use descriptive variable names

### Error Handling

Use Result types instead of throwing exceptions:

```typescript
type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: ErrorType };

// Good
function riskyOperation(): Result<string> {
  if (/* success */) {
    return { kind: 'ok', value: 'success' };
  }
  return { kind: 'err', error: { code: 'error_code', message: '...' } };
}

// Avoid
function riskyOperation(): string {
  if (/* failure */) {
    throw new Error('...');  // Don't do this
  }
  return 'success';
}
```

### Testing

- Write unit tests for all new functionality
- Aim for 100% code coverage
- Use descriptive test names that explain the behavior
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies

Example test structure:

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Documentation

- Add JSDoc comments for public APIs
- Update README.md if adding new features
- Include code examples in documentation
- Keep documentation up to date with code changes

## Package-Specific Guidelines

### packages/base

This package contains core business logic and should be:
- Provider-agnostic (no VS Code dependencies)
- Purely functional where possible
- Fully tested with unit tests
- Well-documented with TypeScript types

### packages/vscode-ext

This package integrates with VS Code and should:
- Follow VS Code extension best practices
- Handle VS Code-specific concerns (commands, webviews, etc.)
- Be thin - delegate to base package for logic
- Include integration tests where appropriate

### packages/lmtapi-vscode

This package bridges to Language Model Tool API:
- Implement VS Code's Language Model Tool protocol
- Transform between API formats
- Handle tool invocation properly

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock all external dependencies
- Cover edge cases and error conditions
- Keep tests fast and isolated

### Integration Tests

- Test interactions between components
- Use real implementations where possible
- Test common user workflows
- May use test doubles for slow operations

### Running Tests

```bash
# All tests
pnpm run test

# Specific package
pnpm --filter @ai-writer/base run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

## Building and Linting

```bash
# Build all packages
pnpm run build

# Build specific package
pnpm --filter @ai-writer/base run build

# Lint all packages
pnpm run lint

# Lint specific package
pnpm --filter @ai-writer/base run lint

# Type check
pnpm run typecheck
```

## Release Process

1. Update version in package.json files
2. Update CHANGELOG.md with release notes
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will handle the release

## Getting Help

- Check existing issues on GitHub
- Read the documentation in `/docs`
- Look at existing code for examples
- Ask questions in pull request discussions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project
- Show empathy towards other contributors

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# Changelog

All notable changes to the AI Writer for VS Code project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Core Infrastructure (Tasks 1-1.2)
- pnpm workspace setup with Base, VS Code Extension, and LMT API packages
- Consistent build, test, and lint scripts across all packages
- TypeScript strict mode configuration
- Configuration service with VS Code Secret Storage integration
- Audit logger for tracking operations
- Debug tracer for development insights

#### Orchestration Layer (Tasks 2.1-2.4)
- **Iteration Engine** - State machine enforcing generate→critique→reflection→question→regenerate cycles
  - Separate workflows for outline and draft modes
  - Invalid transition detection with violation feedback
  - Immutable state management
  - 6 comprehensive unit tests
  
- **Generation Orchestrator** - Session management with template/persona integration
  - Start and manage outline generation cycles
  - Start and manage draft generation cycles
  - Session resumption support
  - History tracking with configurable depth
  - 12 comprehensive unit tests

- **Template Registry** - CRUD operations for writing templates
  - Create, read, update, delete, and list templates
  - Template point management with priorities
  - Compliance tracking for each template point
  - Duplicate detection
  - 15 comprehensive unit tests

- **Persona Manager** - Personalization system
  - Create, read, update, delete, and list personas
  - Tone and audience customization
  - Feature toggles for persona behavior
  - Apply personas to templates
  - Application history tracking
  - 18 comprehensive unit tests

#### AI Provider Integration (Tasks 3.1-3.2)
- **AISDK Hub** - Unified provider interface
  - Provider registration and management
  - Execute and stream text generation
  - Template context integration
  - Provider statistics and monitoring
  - Configuration status checking
  - 12 comprehensive unit tests (3 skipped for real API integration)

- **OpenAI Provider Channel**
  - Integration with OpenAI API via Vercel AI SDK
  - Default model: gpt-4o-mini
  - API key configuration via secret storage
  - Custom model and base URL support
  - 4 unit tests

- **Gemini API Provider Channel**
  - Integration with Google Gemini via Vercel AI SDK
  - Default model: gemini-1.5-flash
  - API key configuration via secret storage
  - Custom model and base URL support
  - 4 unit tests

#### Storage Layer (Task 4.1)
- **Storage Gateway** - File-system based persistence
  - Session save, load, list, and delete operations
  - Template save, load, and list operations
  - Persona save, load, and list operations
  - Draft commit functionality
  - JSON format with pretty printing
  - Automatic directory creation
  - Error handling with fault codes
  - 9 comprehensive unit tests

#### VS Code UI (Task 5.1)
- **Command Controller** - Command registration and execution framework
  - Type-safe command handlers
  - Error handling and logging
  - Output channel integration
  - Command lifecycle management
  - 3 unit tests

- **Commands**
  - `AI Writer: Start Outline Generation` - Interactive outline creation
  - `AI Writer: Start Draft Generation` - Draft generation from outlines
  - Input validation and user feedback
  - Cancellation support

### Testing
- **95 total tests** (92 passing, 3 skipped for integration)
- Comprehensive unit test coverage for all components
- Integration test structure
- Vitest as testing framework
- Mock providers for AI SDK testing

### Documentation
- Comprehensive README with architecture overview
- API reference for all major components
- Usage examples and workflow guides
- Development setup instructions
- Contributing guidelines
- Changelog tracking

### Dependencies
- Vercel AI SDK 5.x for provider abstraction
- @ai-sdk/openai for OpenAI integration
- @ai-sdk/google for Gemini integration
- TypeScript 5.9+ for type safety
- Vitest 1.6+ for testing
- VS Code 1.95+ for extension APIs

### Architecture Decisions
- Clean separation between base logic and VS Code integration
- Result types for error handling (no exceptions)
- Functional programming patterns where appropriate
- Immutable data structures for state management
- Provider registry pattern for extensibility
- Template-driven approach for compliance
- Persona system for personalization

## [0.1.0-dev] - 2025-01-09

### Initial Release
- Foundation implementation complete
- Core business logic in place
- VS Code integration established
- Provider abstraction working
- Storage layer functional
- Command infrastructure ready

[Unreleased]: https://github.com/code-onigiri/ai-writer-for-vscode/compare/v0.1.0-dev...HEAD
[0.1.0-dev]: https://github.com/code-onigiri/ai-writer-for-vscode/releases/tag/v0.1.0-dev

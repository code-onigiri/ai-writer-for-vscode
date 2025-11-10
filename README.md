# AI Writer for VS Code

An autonomous AI writing suite that supports iterative outline/draft generation with template-driven personalization across multiple AI providers.

AIを使用して文章/本を書かせるVScode拡張機能です。

## Features

- 🎨 **GUI-Based Interface**: Intuitive dashboard and settings panels for all operations
- 📡 **Real-time Streaming**: Watch AI-generated content appear in real-time
- 🔄 **Iterative Writing Workflow**: Generate → Critique → Reflect → Question → Regenerate cycle
- 📝 **Template System**: Define and reuse writing templates with compliance tracking
- 🎭 **Persona Management**: Customize tone, audience, and style preferences
- 🤖 **Multi-Provider Support**: OpenAI (GPT-4), Google Gemini, and more
- 💾 **Session Persistence**: Save and resume writing sessions
- 📊 **Progress Tracking**: Monitor generation cycles and template adherence with visual feedback

## Installation

### Prerequisites

- VS Code 1.95.0 or higher
- Node.js 18+ and pnpm 8+

### Setup

1. Clone the repository:
```bash
git clone https://github.com/code-onigiri/ai-writer-for-vscode.git
cd ai-writer-for-vscode
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
# Build all packages
pnpm run build

# Or build just the VS Code extension and its dependencies
pnpm run build:vscode
```

4. Run tests:
```bash
pnpm run test
```

5. Debug the VS Code extension:
   - Open the project in VS Code
   - Press F5 to launch the Extension Development Host
   - See [Debugging Guide](docs/debugging-vscode-extension.md) for details

## Configuration

### API Keys

Configure your AI provider API keys using VS Code's Secret Storage:

1. **OpenAI**: Set `ai-writer.providers.openai.apiKey` or `OPENAI_API_KEY` environment variable
2. **Gemini**: Set `ai-writer.providers.google.apiKey` or `GOOGLE_API_KEY` environment variable

### Storage Paths

By default, AI Writer stores data in the `.ai-writer` directory:

- `sessions/` - Session snapshots and state
- `templates/` - Writing templates
- `personas/` - Persona definitions
- `drafts/` - Generated drafts
- `logs/` - Audit logs

## Usage

### GUI Dashboard

AI Writer now provides a comprehensive GUI interface for all operations:

1. **Open Dashboard**:
   - Click the home icon (🏠) in the AI Writer sidebar
   - Or run `AI Writer: Show Dashboard` from Command Palette

2. **Dashboard Features**:
   - **アウトライン生成**: Start outline generation with a single click
   - **ドラフト生成**: Generate drafts from your outlines
   - **設定**: Configure AI providers, templates, and personas
   - **Recent Sessions**: View and resume your recent writing sessions
   - **Templates**: Manage your writing templates

3. **Settings Panel**:
   - Access via Dashboard or run `AI Writer: Open Settings Panel`
   - Configure AI Providers (OpenAI, Gemini) with API keys and parameters
   - Manage Templates with points and instructions
   - Manage Personas with tone, audience, and custom parameters

### Commands (Still Available)

- **AI Writer: Show Dashboard** - Open the main dashboard
- **AI Writer: Open Settings Panel** - Open settings configuration
- **AI Writer: Start Outline Generation** - Begin creating an outline for your article
- **AI Writer: Start Draft Generation** - Generate a draft from an existing outline

### Basic Workflow

#### GUI-Based Workflow (Recommended)

1. **Open the Dashboard**:
   - Click the home icon in the AI Writer sidebar
   - View your recent sessions and templates

2. **Configure Settings** (First Time):
   - Click the "設定" (Settings) card
   - Add your API keys in the "AI Providers" tab
   - Optionally create templates and personas

3. **Start an Outline**:
   - Click the "アウトライン生成" card
   - Enter your article topic or idea
   - Watch the real-time streaming progress

4. **Monitor Progress**:
   - See each step (Generate, Critique, Reflection, etc.) in real-time
   - Watch AI-generated content stream in as it's being created
   - Review completed steps with timestamps

5. **Generate Draft**:
   - Click the "ドラフト生成" card
   - Select your completed outline
   - Watch the draft generation with real-time updates

#### Command-Based Workflow (Traditional)

1. **Start an Outline**:
   - Open Command Palette (Cmd/Ctrl+Shift+P)
   - Run `AI Writer: Start Outline Generation`
   - Enter your article topic or idea

2. **Iterate through cycles**:
   - Review generated outline
   - Provide critique feedback
   - Reflect on improvements
   - Ask clarifying questions
   - Regenerate with enhancements

3. **Generate Draft**:
   - After outline is complete
   - Run `AI Writer: Start Draft Generation`

## Architecture

### Package Structure

```
packages/
├── base/                    # Core business logic (provider-agnostic)
│   ├── config/             # Configuration and secret management
│   ├── logging/            # Audit logging and debug tracing
│   ├── orchestration/      # Session management and iteration engine
│   ├── persona/            # Personalization system
│   ├── provider/           # AI provider abstraction
│   ├── storage/            # File-system persistence
│   └── template/           # Template registry
├── vscode-ext/             # VS Code extension layer
│   ├── commands/           # Command controller and handlers
│   └── configuration/      # VS Code integration
└── lmtapi-vscode/          # Language Model Tool API bridge
```

### Core Components

#### Iteration Engine

Enforces workflow order for outline and draft modes:

```typescript
import { createIterationEngine } from '@ai-writer/base';

const engine = createIterationEngine();
const state = engine.initializeState('outline');
const result = engine.handleStep(state, {
  type: 'generate',
  payload: { prompt: 'Write about AI' }
});
```

#### Generation Orchestrator

Manages sessions with template/persona context:

```typescript
import { createGenerationOrchestrator } from '@ai-writer/base';

const orchestrator = createGenerationOrchestrator();
const session = await orchestrator.startOutlineCycle({
  idea: "Write about AI in education",
  templateId: "technical-writing",
  personaId: "professional-tone",
  historyDepth: 5
});
```

#### AISDK Hub

Unified provider interface:

```typescript
import { createAISDKHub, createOpenAIChannel } from '@ai-writer/base';

const hub = createAISDKHub();
const channel = await createOpenAIChannel({ configService });
hub.registerProvider(channel);

const result = await hub.execute({
  key: 'openai',
  payload: { prompt: "...", mode: 'outline' },
  templateContext: { points: [...] }
});
```

#### Storage Gateway

File-system persistence:

```typescript
import { createStorageGateway } from '@ai-writer/base';

const gateway = createStorageGateway({ pathConfig });
await gateway.saveSession(sessionSnapshot);
await gateway.saveTemplate(template);
await gateway.savePersona(persona);
```

## Development

### Building

```bash
# Build all packages
pnpm run build

# Build specific package
pnpm --filter @ai-writer/base run build
```

### Testing

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch
```

### Linting

```bash
# Lint all packages
pnpm run lint
```

## Testing

The project includes 95 comprehensive unit tests covering:

- ✅ Iteration engine state transitions
- ✅ Generation orchestrator session management
- ✅ Template registry CRUD operations
- ✅ Persona manager personalization
- ✅ AISDK Hub provider abstraction
- ✅ Provider channel configurations
- ✅ Storage gateway persistence
- ✅ Command controller execution

## Roadmap

### Completed ✅

- [x] Project infrastructure with pnpm workspace
- [x] Iteration engine with state machine
- [x] Generation orchestrator for session management
- [x] Template registry with CRUD operations
- [x] Persona manager with personalization
- [x] AISDK Hub with provider registry
- [x] OpenAI and Gemini API provider channels
- [x] Storage gateway with JSON persistence
- [x] Command controller with basic commands

### Recently Added ✨

- [x] Main Dashboard with GUI interface
- [x] Settings Panel for AI providers, templates, and personas
- [x] Real-time streaming progress display
- [x] Interactive webview-based controls
- [x] Visual session and template management

### Planned 🚧

- [ ] Git integration for version control
- [ ] Gemini CLI provider
- [ ] Language Model Tool API bridge
- [ ] Audit log visualization
- [ ] Statistics dashboard
- [ ] Drag-and-drop template builder
- [ ] Advanced persona parameter management

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions, please visit:
https://github.com/code-onigiri/ai-writer-for-vscode

## Acknowledgments

Built with:
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI provider abstraction
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vitest](https://vitest.dev/) - Testing framework
- [VS Code Extension API](https://code.visualstudio.com/api) - Editor integration

# AI Writer for VSCode - API Reference

## Table of Contents

1. [Language Model Integration](#language-model-integration)
2. [Views and Panels](#views-and-panels)
3. [Commands](#commands)
4. [Services](#services)
5. [Types](#types)

## Language Model Integration

### LanguageModelBridge

Singleton bridge to VSCode's Language Model API.

#### Methods

##### `getInstance(): LanguageModelBridge`
Get the singleton instance.

```typescript
const bridge = LanguageModelBridge.getInstance();
```

##### `isAvailable(): boolean`
Check if Language Model API is available.

```typescript
if (bridge.isAvailable()) {
  // API is available
}
```

##### `getAvailableModels(): Promise<vscode.LanguageModelChat[]>`
Get all available language models.

```typescript
const models = await bridge.getAvailableModels();
console.log(`Found ${models.length} models`);
```

##### `getModel(options?): Promise<vscode.LanguageModelChat | undefined>`
Get a specific model by vendor, family, or version.

**Parameters:**
- `options.vendor?: string` - Model vendor (e.g., 'copilot')
- `options.family?: string` - Model family (e.g., 'gpt-4')
- `options.version?: string` - Model version

```typescript
const model = await bridge.getModel({
  vendor: 'copilot',
  family: 'gpt-4'
});
```

##### `sendRequest(model, messages, options?): Promise<string>`
Send a chat request to a language model.

**Parameters:**
- `model: vscode.LanguageModelChat` - The model to use
- `messages: vscode.LanguageModelChatMessage[]` - Chat messages
- `options.justification?: string` - Justification for the request
- `options.cancellationToken?: vscode.CancellationToken` - Cancellation token
- `options.onProgress?: (chunk: string) => void` - Progress callback

**Returns:** Complete response text

```typescript
const response = await bridge.sendRequest(
  model,
  [bridge.createUserMessage('Hello')],
  {
    justification: 'AI Writer content generation',
    onProgress: (chunk) => console.log(chunk)
  }
);
```

##### `sendStreamingRequest(model, messages, options?): AsyncGenerator<string>`
Send a streaming request to a language model.

**Parameters:**
- `model: vscode.LanguageModelChat` - The model to use
- `messages: vscode.LanguageModelChatMessage[]` - Chat messages
- `options.justification?: string` - Justification for the request
- `options.cancellationToken?: vscode.CancellationToken` - Cancellation token

**Yields:** Text chunks as they arrive

```typescript
for await (const chunk of bridge.sendStreamingRequest(model, messages)) {
  process.stdout.write(chunk);
}
```

##### `createUserMessage(content: string): vscode.LanguageModelChatMessage`
Create a user message.

```typescript
const msg = bridge.createUserMessage('Write an introduction');
```

##### `createAssistantMessage(content: string): vscode.LanguageModelChatMessage`
Create an assistant message.

```typescript
const msg = bridge.createAssistantMessage('Here is the introduction...');
```

##### `countTokens(model, messages): Promise<number>`
Count tokens in messages.

**Parameters:**
- `model: vscode.LanguageModelChat` - The model to use
- `messages: vscode.LanguageModelChatMessage | vscode.LanguageModelChatMessage[] | string` - Messages or string

**Returns:** Token count

```typescript
const count = await bridge.countTokens(model, 'Hello, world!');
console.log(`Token count: ${count}`);
```

##### `getModelInfo(model): ModelInfo`
Get information about a model.

**Returns:**
```typescript
{
  id: string;
  vendor: string;
  family: string;
  version: string;
  name: string;
  maxInputTokens: number;
}
```

### LanguageModelChatProvider

High-level provider for language model chat functionality.

#### Constructor

```typescript
const provider = new LanguageModelChatProvider();
```

#### Methods

##### `isAvailable(): Promise<boolean>`
Check if the provider is available.

```typescript
const available = await provider.isAvailable();
```

##### `initialize(options?): Promise<boolean>`
Initialize with a specific model.

**Parameters:**
- `options.vendor?: string` - Model vendor
- `options.family?: string` - Model family
- `options.version?: string` - Model version

**Returns:** `true` if initialization succeeded

```typescript
const success = await provider.initialize({
  vendor: 'copilot'
});
```

##### `getCurrentModelInfo(): ModelInfo | undefined`
Get current model information.

```typescript
const info = provider.getCurrentModelInfo();
if (info) {
  console.log(`Using model: ${info.name}`);
}
```

##### `generate(prompt, options?): Promise<string>`
Generate content using the current model.

**Parameters:**
- `prompt: string` - The prompt
- `options.systemPrompt?: string` - System prompt
- `options.justification?: string` - Request justification
- `options.cancellationToken?: vscode.CancellationToken` - Cancellation token
- `options.onProgress?: (chunk: string) => void` - Progress callback

**Returns:** Generated content

```typescript
const content = await provider.generate(
  'Write an introduction about AI',
  {
    systemPrompt: 'You are a professional writer',
    justification: 'AI Writer content generation',
    onProgress: (chunk) => console.log(chunk)
  }
);
```

##### `generateStreaming(prompt, options?): AsyncGenerator<string>`
Generate content with streaming.

**Parameters:**
- `prompt: string` - The prompt
- `options.systemPrompt?: string` - System prompt
- `options.justification?: string` - Request justification
- `options.cancellationToken?: vscode.CancellationToken` - Cancellation token

**Yields:** Content chunks

```typescript
for await (const chunk of provider.generateStreaming('Write content...')) {
  process.stdout.write(chunk);
}
```

##### `generateWithHistory(messages, options?): Promise<string>`
Generate with conversation history.

**Parameters:**
- `messages: { role: 'user' | 'assistant'; content: string }[]` - Conversation history
- `options.justification?: string` - Request justification
- `options.cancellationToken?: vscode.CancellationToken` - Cancellation token
- `options.onProgress?: (chunk: string) => void` - Progress callback

**Returns:** Generated response

```typescript
const response = await provider.generateWithHistory([
  { role: 'user', content: 'What is AI?' },
  { role: 'assistant', content: 'AI stands for Artificial Intelligence...' },
  { role: 'user', content: 'Tell me more' }
]);
```

##### `countTokens(prompt: string): Promise<number>`
Count tokens for a prompt.

```typescript
const count = await provider.countTokens('Hello, world!');
```

### LanguageModelToolManager

Manager for Language Model tools registration and lifecycle.

#### Constructor

```typescript
const manager = new LanguageModelToolManager();
```

#### Methods

##### `registerTools(): vscode.Disposable[]`
Register all tools with VSCode.

**Returns:** Array of disposables for cleanup

```typescript
const disposables = manager.registerTools();
context.subscriptions.push(...disposables);
```

##### `getTool(name: string): vscode.LanguageModelTool | undefined`
Get a specific tool by name.

```typescript
const tool = manager.getTool('aiWriter_checkTemplateCompliance');
```

##### `getToolNames(): string[]`
Get all registered tool names.

```typescript
const names = manager.getToolNames();
// ['aiWriter_checkTemplateCompliance', 'aiWriter_getTemplate', 'aiWriter_getPersona']
```

##### `dispose(): void`
Dispose all registered tools.

```typescript
manager.dispose();
```

## Views and Panels

### ProgressPanelProvider

Provider for the progress visualization panel.

#### Methods

##### `show(state): void`
Show the progress panel with initial state.

**Parameters:**
```typescript
{
  sessionId: string;
  mode: 'outline' | 'draft';
  currentStep: 'generate' | 'critique' | 'reflect' | 'question' | 'regenerate';
  steps: Array<{
    type: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    timestamp: string;
    content?: string;
    error?: string;
  }>;
  isStreaming: boolean;
}
```

```typescript
progressPanel.show({
  sessionId: 'session-123',
  mode: 'outline',
  currentStep: 'generate',
  steps: [{
    type: 'generate',
    status: 'running',
    timestamp: new Date().toISOString()
  }],
  isStreaming: true
});
```

##### `updateState(state): void`
Update the panel state.

```typescript
progressPanel.updateState({
  currentStep: 'critique',
  steps: [...],
  isStreaming: false
});
```

##### `appendStreamContent(stepType, chunk): void`
Append streaming content to a step.

```typescript
progressPanel.appendStreamContent('generate', 'Generated text chunk...');
```

### TemplateEditorPanel

Panel for creating and editing templates.

#### Static Methods

##### `createOrShow(extensionUri, registry, template?): void`
Create or show the template editor.

**Parameters:**
- `extensionUri: vscode.Uri` - Extension URI
- `registry: TemplateRegistryLike` - Template registry
- `template?: TemplateDescriptorLike` - Template to edit (optional)

```typescript
TemplateEditorPanel.createOrShow(
  context.extensionUri,
  templateRegistry,
  existingTemplate
);
```

### PersonaEditorPanel

Panel for creating and editing personas.

#### Static Methods

##### `createOrShow(extensionUri, manager, persona?): void`
Create or show the persona editor.

**Parameters:**
- `extensionUri: vscode.Uri` - Extension URI
- `manager: PersonaManagerLike` - Persona manager
- `persona?: PersonaDefinitionLike` - Persona to edit (optional)

```typescript
PersonaEditorPanel.createOrShow(
  context.extensionUri,
  personaManager,
  existingPersona
);
```

### ProviderSettingsPanel

Panel for configuring AI providers.

#### Static Methods

##### `createOrShow(extensionUri, context): void`
Create or show the provider settings panel.

**Parameters:**
- `extensionUri: vscode.Uri` - Extension URI
- `context: vscode.ExtensionContext` - Extension context

```typescript
ProviderSettingsPanel.createOrShow(
  context.extensionUri,
  context
);
```

### DocumentRevisionPanel

Panel for document revision with AI suggestions.

#### Static Methods

##### `createOrShow(extensionUri): void`
Create or show the document revision panel.

**Parameters:**
- `extensionUri: vscode.Uri` - Extension URI

```typescript
DocumentRevisionPanel.createOrShow(context.extensionUri);
```

## Commands

### Generation Commands

#### `ai-writer.startOutline`
Start outline generation for a new document.

```typescript
await vscode.commands.executeCommand('ai-writer.startOutline');
```

#### `ai-writer.startDraft`
Start draft generation based on an outline.

```typescript
await vscode.commands.executeCommand('ai-writer.startDraft');
```

### Template Commands

#### `ai-writer.listTemplates`
List all available templates.

```typescript
await vscode.commands.executeCommand('ai-writer.listTemplates');
```

#### `ai-writer.createTemplate`
Create a new template.

```typescript
await vscode.commands.executeCommand('ai-writer.createTemplate');
```

#### `ai-writer.editTemplate`
Edit an existing template.

```typescript
await vscode.commands.executeCommand('ai-writer.editTemplate');
```

#### `ai-writer.viewComplianceReport`
View template compliance report.

```typescript
await vscode.commands.executeCommand('ai-writer.viewComplianceReport');
```

### Persona Commands

#### `ai-writer.listPersonas`
List all available personas.

```typescript
await vscode.commands.executeCommand('ai-writer.listPersonas');
```

#### `ai-writer.createPersona`
Create a new persona.

```typescript
await vscode.commands.executeCommand('ai-writer.createPersona');
```

#### `ai-writer.editPersona`
Edit an existing persona.

```typescript
await vscode.commands.executeCommand('ai-writer.editPersona');
```

#### `ai-writer.validateCompatibility`
Validate persona-template compatibility.

```typescript
await vscode.commands.executeCommand('ai-writer.validateCompatibility');
```

### Provider Commands

#### `ai-writer.configureProviders`
Open provider configuration panel.

```typescript
await vscode.commands.executeCommand('ai-writer.configureProviders');
```

### Revision Commands

#### `ai-writer.reviseDocument`
Revise the current document with AI suggestions.

```typescript
await vscode.commands.executeCommand('ai-writer.reviseDocument');
```

### Statistics Commands

#### `ai-writer.viewStorageStats`
View storage statistics.

```typescript
await vscode.commands.executeCommand('ai-writer.viewStorageStats');
```

#### `ai-writer.viewAuditStats`
View audit statistics.

```typescript
await vscode.commands.executeCommand('ai-writer.viewAuditStats');
```

#### `ai-writer.cleanupStorage`
Cleanup old sessions.

```typescript
await vscode.commands.executeCommand('ai-writer.cleanupStorage');
```

## Services

### SessionManager

Manages generation sessions.

```typescript
interface SessionManager {
  createSession(config: SessionConfig): Session;
  getSession(sessionId: string): Session | undefined;
  listSessions(): Session[];
  openSessionPreview(session: Session): Promise<void>;
}
```

### TemplateRegistry

Manages templates.

```typescript
interface TemplateRegistryLike {
  listTemplates(): Promise<Result<TemplateDescriptorLike[]>>;
  getTemplate(id: string): Promise<Result<TemplateDescriptorLike>>;
  createTemplate(draft: TemplateDraftLike): Promise<Result<TemplateDescriptorLike>>;
  updateTemplate(id: string, updates: Partial<TemplateDraftLike>): Promise<Result<TemplateDescriptorLike>>;
}
```

### PersonaManager

Manages personas.

```typescript
interface PersonaManagerLike {
  listPersonas(): Promise<Result<PersonaDefinitionLike[]>>;
  getPersona(id: string): Promise<Result<PersonaDefinitionLike>>;
  upsertPersona(draft: PersonaDraftLike): Promise<Result<PersonaDefinitionLike>>;
}
```

## Types

### Session

```typescript
interface Session {
  id: string;
  mode: 'outline' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'failed';
}
```

### TemplateDescriptor

```typescript
interface TemplateDescriptorLike {
  id: string;
  name: string;
  points: TemplatePointLike[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    personaHints: readonly string[];
  };
}
```

### TemplatePoint

```typescript
interface TemplatePointLike {
  id: string;
  title: string;
  instructions: string;
  priority: number;
}
```

### PersonaDefinition

```typescript
interface PersonaDefinitionLike {
  id: string;
  name: string;
  tone: string;
  audience: string;
  toggles: Record<string, boolean>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    source?: string;
  };
}
```

### CommandResult

```typescript
type CommandResult<T> = 
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: string }
  | { kind: 'cancelled' };
```

## Error Handling

All async operations return `Promise<Result<T>>` where Result is:

```typescript
type Result<T> = 
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: Error };
```

Example error handling:

```typescript
const result = await templateRegistry.createTemplate(draft);

if (result.kind === 'ok') {
  console.log('Template created:', result.value.id);
} else {
  console.error('Failed to create template:', result.error.message);
}
```

## Configuration

Extension configuration is stored in VSCode settings:

```json
{
  "aiWriter.providers": [
    {
      "type": "openai",
      "enabled": true,
      "model": "gpt-4"
    }
  ]
}
```

API keys are stored securely in VSCode's Secret Storage.

## Events

The extension doesn't currently expose custom events, but uses VSCode's standard event system for UI updates.

## License

MIT License - See LICENSE file for details.

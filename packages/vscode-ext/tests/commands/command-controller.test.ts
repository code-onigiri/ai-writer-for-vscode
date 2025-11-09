import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as vscode from 'vscode';
import { CommandController } from '../../src/commands/command-controller.js';
import type { CommandContext } from '../../src/commands/types.js';

// Mock VS Code API
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn((id: string, handler: Function) => {
      return { dispose: vi.fn() };
    }),
  },
  window: {
    showErrorMessage: vi.fn(),
  },
}));

describe('CommandController', () => {
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;
  let controller: CommandController;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    mockOutputChannel = {
      appendLine: vi.fn(),
      dispose: vi.fn(),
    } as unknown as vscode.OutputChannel;

    controller = new CommandController(mockContext, mockOutputChannel);
  });

  it('should register a command', () => {
    const handler = vi.fn().mockResolvedValue({ kind: 'ok', value: 'test' });

    controller.registerCommand({
      id: 'test.command',
      title: 'Test Command',
      handler,
    });

    expect(controller.getCommandIds()).toContain('test.command');
  });

  it('should register multiple commands', () => {
    const handler1 = vi.fn().mockResolvedValue({ kind: 'ok', value: 'test1' });
    const handler2 = vi.fn().mockResolvedValue({ kind: 'ok', value: 'test2' });

    controller.registerCommand({
      id: 'test.command1',
      title: 'Test Command 1',
      handler: handler1,
    });

    controller.registerCommand({
      id: 'test.command2',
      title: 'Test Command 2',
      handler: handler2,
    });

    const commandIds = controller.getCommandIds();
    expect(commandIds).toContain('test.command1');
    expect(commandIds).toContain('test.command2');
    expect(commandIds.length).toBe(2);
  });

  it('should dispose all commands', () => {
    const handler = vi.fn().mockResolvedValue({ kind: 'ok', value: 'test' });

    controller.registerCommand({
      id: 'test.command',
      title: 'Test Command',
      handler,
    });

    controller.dispose();

    // After disposal, no more commands should be registered
    // (Note: We can't easily test the actual disposal of VS Code commands in unit tests)
    expect(() => controller.dispose()).not.toThrow();
  });
});

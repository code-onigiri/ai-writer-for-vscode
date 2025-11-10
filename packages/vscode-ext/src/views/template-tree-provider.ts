import * as vscode from 'vscode';

import type {
  TemplateDescriptorLike,
  TemplatePointLike,
  TemplateRegistryLike,
} from '../commands/types.js';

export class TemplateTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly changeEmitter = new vscode.EventEmitter<vscode.TreeItem | undefined>();

  constructor(private readonly registry?: TemplateRegistryLike) {}

  get onDidChangeTreeData(): vscode.Event<vscode.TreeItem | undefined> {
    return this.changeEmitter.event;
  }

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  async getChildren(element?: TemplateTreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      return element.children;
    }

    if (!this.registry) {
      return [new InfoTreeItem('Template registry not available')];
    }

    const result = await this.registry.listTemplates();
    if (result.kind === 'err') {
      return [new InfoTreeItem(`Failed to load templates: ${result.error.message}`)];
    }

    if (!result.value || result.value.length === 0) {
      return [new InfoTreeItem('No templates yet. Use AI Writer: Create Template to add one.')];
    }

    return result.value.map((template) => new TemplateTreeItem(template));
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }
}

class TemplateTreeItem extends vscode.TreeItem {
  readonly children: readonly vscode.TreeItem[];

  constructor(readonly template: TemplateDescriptorLike) {
    super(template.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.tooltip = TemplateTreeItem.buildTooltip(template);
    this.description = `${template.points.length} points`;
    this.iconPath = new vscode.ThemeIcon('symbol-folder');
    this.contextValue = 'aiWriterTemplate';
    this.command = {
      command: 'ai-writer.showTemplateDetails',
      title: 'Show Template Details',
      arguments: [template.id],
    };
    this.children = template.points.map((point) => new TemplatePointTreeItem(point));
  }

  private static buildTooltip(template: TemplateDescriptorLike): string {
    const hints = template.metadata.personaHints.length > 0
      ? `Hints: ${template.metadata.personaHints.join(', ')}`
      : 'No persona hints';

    return [
      `Template ID: ${template.id}`,
      `Updated: ${new Date(template.metadata.updatedAt).toLocaleString()}`,
      hints,
    ].join('\n');
  }
}

class TemplatePointTreeItem extends vscode.TreeItem {
  constructor(point: TemplatePointLike) {
    super(point.title, vscode.TreeItemCollapsibleState.None);

    this.description = `Priority ${point.priority}`;
    this.tooltip = point.instructions;
    this.iconPath = new vscode.ThemeIcon('symbol-property');
    this.contextValue = 'aiWriterTemplatePoint';
  }
}

class InfoTreeItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'aiWriterTemplateInfo';
    this.iconPath = new vscode.ThemeIcon('info');
  }
}

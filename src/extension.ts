'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import type MarkdownIt from 'markdown-it'

import { CommandCopy, CommandCopyWithStyles } from './commands/copy'
import { CommandExportCurrent } from './commands/exportCurrent'
import { CommandExportWorkSpace } from './commands/exportWorkspace'
import { CommandFormateTable } from './commands/formateTable'
import { CommandInstallBrowser } from './commands/installBrowser'
import { CommandPasteTable } from './commands/pasteTable'
import { commandTableEdits } from './commands/tableEdits'
import { commandToggles } from './commands/toggleFormats'

import { BrowserManager } from './services/browser/browserManager'
import { Config } from './services/common/config'
import { ExtensionContext } from './services/common/extensionContext'
import { mdConfig } from './services/contributes/mdConfig'

import { plugins } from './plugin/plugins'


// Deprecated: Use ExtensionContext.current.markdown instead
// @deprecated
export let markdown: MarkdownIt;
// Deprecated: Use ExtensionContext.current.vsContext instead
// @deprecated
export let context: vscode.ExtensionContext;
// Deprecated: Use ExtensionContext.current.outputPanel instead
// @deprecated
export let outputPanel: vscode.OutputChannel;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(ctx: vscode.ExtensionContext) {
    // Initialize the new centralized extension context
    const extensionContext = ExtensionContext.initialize(ctx);
    
    // Initialize BrowserManager singleton
    BrowserManager.initialize(ctx);
    
    // Maintain backwards compatibility with old global exports
    context = ctx;
    outputPanel = extensionContext.outputPanel;
    const subscriptions = [
        extensionContext.outputPanel,
        Config.instance,
        mdConfig,
        commandToggles,
        commandTableEdits,
        new CommandExportCurrent(),
        new CommandExportWorkSpace(),
        new CommandCopy(),
        new CommandCopyWithStyles(),
        new CommandPasteTable(),
        new CommandFormateTable(),
        new CommandInstallBrowser(),
    ].filter(Boolean);
    
    ctx.subscriptions.push(...subscriptions);
    return {
        extendMarkdownIt(md: MarkdownIt) {
            // Filter out null/undefined plugins and add error handling
            plugins
                .filter(p => p && typeof p.plugin === 'function')
                .forEach(({plugin, args}) => {
                    try {
                        md.use(plugin, ...args);
                    } catch (error) {
                        const output = extensionContext.outputPanel;
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        output.appendLine(`[ERROR] Failed to load markdown plugin: ${errorMessage}`);
                        vscode.window.showWarningMessage(
                            `Markdown plugin failed to load: ${errorMessage}`
                        );
                    }
                });
            
            // Update both new and legacy references
            extensionContext.setMarkdown(md);
            markdown = md;
            
            return md;
        }
    };
}

// this method is called when your extension is deactivated
export function deactivate() {
    // Clean up the ExtensionContext singleton
    // This ensures proper resource cleanup when the extension is deactivated
    ExtensionContext._reset();
}
import * as vscode from 'vscode';

import { NetstatTextDocumentContentProvider } from './NetstatTextDocumentContentProvider';

export function activate({ subscriptions }: vscode.ExtensionContext) {
  // register a content provider for the cowsay-scheme
  const netstatSchemeProvider = new NetstatTextDocumentContentProvider();

  subscriptions.push(netstatSchemeProvider);
  subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      NetstatTextDocumentContentProvider.NETSTAT,
      netstatSchemeProvider
    )
  );

  // register a command that opens netstat buffer
  subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-netstat',
      () => {
        netstatSchemeProvider.open(NetstatTextDocumentContentProvider.NETSTAT);
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.kill-owner-process',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.killOwnerProcess(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-all-ports',
      (editor) => {
        netstatSchemeProvider.toggleAllPorts();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-listening',
      (editor) => {
        netstatSchemeProvider.toggleListening();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-established',
      (editor) => {
        netstatSchemeProvider.toggleEstablished();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-close-wait',
      (editor) => {
        netstatSchemeProvider.toggleCloseWait();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-time-wait',
      (editor) => {
        netstatSchemeProvider.toggleTimeWait();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.mark',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.mark(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.mark-all',
      (editor) => {
        netstatSchemeProvider.markAll();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.unmark',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.unmark(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.unmark-all',
      (editor) => {
        netstatSchemeProvider.unmarkAll();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-mark',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.toggleMark(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.toggle-mark-all',
      (editor) => {
        netstatSchemeProvider.toggleMarkAll();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.previous',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.previous(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.next',
      (editor) => {
        const lineNumber = editor.selection.start.line;
        const lineCount = editor.document.lineCount;
        if (lineNumber > 3 && lineNumber < lineCount - 1) {
          netstatSchemeProvider.next(lineNumber);
        }
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.refresh',
      (editor) => {
        netstatSchemeProvider.reload();
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.open-settings',
      (editor) => {
        vscode.commands.executeCommand( 'workbench.action.openSettings', 'vscode-netstat.ports' );
      }
    )
  );

  subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-netstat.quit',
      (editor) => {
        netstatSchemeProvider.quit();
      }
    )
  );
}

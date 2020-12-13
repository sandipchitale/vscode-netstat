import * as vscode from "vscode";
import { TextDocument, TextEditor } from 'vscode';
import * as child_process from 'child_process';

export class NetstatTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
  static readonly NETSTAT = 'netstat'

  // emitter and its event
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  private uri: vscode.Uri | undefined = undefined;
  private markedLines: Array<number> = [];

  private netstatTextDocument: undefined | TextDocument;
  private netstatTextEditor: undefined | TextEditor;

  private rawNetstatBuffer = '';

  private listening = true;
  private established = false;
  private closeWait = false;
  private timeWait = false;
  private ports: Array<number> = [];

  constructor() {

    this._loadPortsFromConfig();
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('vscode-netstat.ports')) {
        this._loadPortsFromConfig();
        this.markedLines = [];
        if (this.netstatTextEditor ===  vscode.window.activeTextEditor) {
          this.reload();
        }
      }
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.uri.scheme === NetstatTextDocumentContentProvider.NETSTAT) {
        editor.options = {
          cursorStyle: vscode.TextEditorCursorStyle.BlockOutline,
        };
        vscode.commands.executeCommand('setContext', 'vscode-netstat', true);
        this.reload();
      } else {
        vscode.commands.executeCommand('setContext', 'vscode-netstat', false);
      }
    });
  }

  private _loadPortsFromConfig() {
    // Load configuration
    const config = vscode.workspace.getConfiguration('vscode-netstat');
    this.ports = [];
    if (config && config.get('ports')) {
      this.ports = <Array<any>>config.get('ports');
    }
  }

  provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    return this.buffer(uri);
  }

  dispose(): any {
    this.netstatTextDocument = undefined;
    this.netstatTextEditor = undefined;

    this.onDidChangeEmitter.dispose();
  }

  buffer(uri: vscode.Uri) : Promise<string> {
    this.uri = uri;
    return new Promise((resolve, reject) => {
      if (this.rawNetstatBuffer.length === 0) {
        const dirProcess = child_process.spawn(
          'cmd',
          [
            '/C'
            ,'netstat'
            ,'-anop'
            ,'tcp'
          ]
        );

        dirProcess.stdout.on('data', (data) => {
          this.rawNetstatBuffer += data;
        });

        dirProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
          reject(data);
        });

        dirProcess.on('exit', (code) => {
          this.rawNetstatBuffer = this.rawNetstatBuffer.split('\r\n').join('\n');
          resolve(this._processedNetstatBuffer(this.rawNetstatBuffer));
        });
      } else {
        resolve(this._processedNetstatBuffer(this.rawNetstatBuffer));
      }
    });
  }

  private _processedNetstatBuffer(rawNetstatBuffer: string): string {
    let netstatBufferLines = rawNetstatBuffer.split('\n');

    netstatBufferLines[1] =
`${netstatBufferLines[1]} (`
+ ` l - ${this.listening ? 'Hide' : 'Show'} LISTENING`
+ `,`
+ ` e - ${this.established ? 'Hide' : 'Show'} ESTABLISHED`
+ `,`
+ ` c - ${this.closeWait ? 'Hide' : 'Show'} CLOSE_WAIT`
+ `,`
+ ` t - ${this.timeWait ? 'Hide' : 'Show'} TIME_WAIT`
+ ` )`;

    netstatBufferLines[2] =
    `(`
    + ` k - Kill process owning the port`
    + `,`
    + ` s - settings`
    + `,`
    + ` q - Quit`
    + ` ) Monitoring Ports: ${this.ports.length === 0 ? 'All' : this.ports.join(',')}`;

    netstatBufferLines = netstatBufferLines.filter((netstatBufferLine, index) => {
      return (index < 4 ||
        ((this.ports.length === 0 || RegExp(`:(${this.ports.join('|')}\\s)`).test(netstatBufferLine.substring(0,32))) &&
          (
            (this.listening && netstatBufferLine.includes('LISTENING')) ||
            (this.established && netstatBufferLine.includes('ESTABLISHED')) ||
            (this.closeWait && netstatBufferLine.includes('CLOSE_WAIT')) ||
            (this.timeWait && netstatBufferLine.includes('TIME_WAIT'))
          )
        )
      );
    });

    for (let i = 4; i < netstatBufferLines.length; i++) {
      const lineNumberIndex = this.markedLines.indexOf(i);
      netstatBufferLines[i] = `${lineNumberIndex === -1 ? ' ' : '*'} ${netstatBufferLines[i].substring(2)}`;
    }
    return netstatBufferLines.join('\n') + '\n';
  }

  open(dir: string) {
    this.rawNetstatBuffer = '';
    this.markedLines = [];
    if (this.netstatTextDocument) {
      vscode.window.showTextDocument(this.netstatTextDocument, { preview: false }).then(() => {
        vscode.commands.executeCommand("workbench.action.closeActiveEditor").then(async () => {
          this._open(dir);
        });
      });
    } else {
      this._open(dir);
    }
  }

  async _open(dir: string) {
    const uri = vscode.Uri.parse(`${NetstatTextDocumentContentProvider.NETSTAT}:///${ dir }`);
    this.netstatTextDocument = await vscode.workspace.openTextDocument(uri);
    vscode.languages.setTextDocumentLanguage(this.netstatTextDocument, 'netstat');
    this.netstatTextEditor = await vscode.window.showTextDocument(this.netstatTextDocument, { preview: false });
    this.netstatTextEditor.options.insertSpaces = false;
    this.netstatTextEditor.options.tabSize = 0;
    this._goto(4);
  }

  isMarked(lineNumber: number): boolean {
    return (this.markedLines.indexOf(lineNumber) !== -1);
  }

  toggleAllPorts() {
    if (this.ports.length === 0) {
      this._loadPortsFromConfig();
    } else {
      this.ports = [];
    }
    this.markedLines = [];
    this.reload();
  }

  toggleListening() {
    this.listening = !this.listening;
    this.markedLines = [];
    this.refresh();
  }

  toggleEstablished() {
    this.established = !this.established;
    this.markedLines = [];
    this.refresh();
  }

  toggleCloseWait() {
    this.closeWait = !this.closeWait;
    this.markedLines = [];
    this.refresh();
  }

  toggleTimeWait() {
    this.timeWait = !this.timeWait;
    this.markedLines = [];
    this.refresh();
  }

  killOwnerProcess(lineNumber: number, advance = true) {
    const lineCount = this.netstatTextDocument?.lineCount;
    if (lineNumber > 3 && lineNumber < lineCount! - 1) {
      const lineText = this.netstatTextDocument?.lineAt(lineNumber);
      const processId = +lineText!.text.substring(71);
      if (processId > 0) {
        vscode.window.showInformationMessage(`Kill process id: ${processId}`, 'No', 'Yes').then(response => {
          if (response === 'Yes') {
            const dirProcess = child_process.spawn(
              'cmd',
              [
                '/C'
                ,'taskkill'
                ,'/F'
                ,'/PID'
                ,`${processId}`
              ]
            );
            dirProcess.on('exit', (code) => {
              console.error(`taskkill exited with code: ${code}`);
              this.reload();
            });
          }
        });
      }
    }
  }

  mark(lineNumber: number, advance = true) {
    const lineNumberIndex = this.markedLines.indexOf(lineNumber);
    if (lineNumberIndex === -1) {
      this.markedLines.push(lineNumber);
      this.refresh();
    if (advance) {
        this.next(lineNumber);
      }
    }
  }

  markAll() {
    this.markedLines = [];
    const lineCount = this.netstatTextDocument!.lineCount;
    for (let i = 4; i < lineCount; i++) {
      this.markedLines.push(i);
    }
    this.refresh();
    this._goto(4);
  }

  unmark(lineNumber: number, advance = true) {
    const lineNumberIndex = this.markedLines.indexOf(lineNumber);
    if (lineNumberIndex !== -1) {
      this.markedLines.splice(lineNumberIndex, 1);
      this.refresh();
      if (advance) {
        this.next(lineNumber);
      }
    }
  }

  unmarkAll() {
    this.markedLines = [];
    this.refresh();
    this._goto(4);
  }

  toggleMark(lineNumber: number) {
    if (this.isMarked(lineNumber)) {
      this.unmark(lineNumber, false);
    } else {
      this.mark(lineNumber, false);
    }
  }

  toggleMarkAll() {
    const lineCount = this.netstatTextDocument!.lineCount;
    for (let i = 4; i < lineCount; i++) {
      if (this.isMarked(i)) {
        this.unmark(i, false);
      } else {
        this.mark(i, false);
      }
    }
    this.refresh();
    this._goto(4);
  }

  next(lineNumber: number) {
    this._goto(lineNumber+1);
  }

  previous(lineNumber: number) {
    this._goto(lineNumber-1);
  }

  private _goto(lineNumber: number) {
    this.netstatTextEditor!.selection = new vscode.Selection(lineNumber, 71, lineNumber, 71);
  }

  reload() {
    this.rawNetstatBuffer = '';
    this.refresh();
  }

  refresh() {
    this.onDidChangeEmitter.fire(this.uri);
  }

  quit() {
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }

}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
class PerlSyntaxProvider {
    activate(subscriptions) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
        vscode.workspace.onDidCloseTextDocument(textDocument => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        vscode.workspace.onDidOpenTextDocument(this.check, this, subscriptions);
        vscode.workspace.onDidSaveTextDocument(this.check, this);
        vscode.workspace.onDidCloseTextDocument(textDocument => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
    }
    dispose() {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
        this.command.dispose();
    }
    check(textDocument) {
        this.document = textDocument;
        if (this.document.uri.scheme === "git") {
            return;
        }
        if (this.document.languageId !== "perl") {
            return;
        }
        this.configuration = vscode.workspace.getConfiguration("perl-toolbox.syntax");
        if (!this.configuration.enabled) {
            return;
        }
        let decoded = "";
        this.tempfilepath =
            this.getTemporaryPath() +
                path.sep +
                path.basename(this.document.fileName) +
                ".syntax";
        fs.writeFile(this.tempfilepath, this.document.getText(), () => {
            let proc = cp.spawn(this.configuration.exec, [this.getIncludePaths(), "-c", this.tempfilepath], this.getCommandOptions());
            proc.stderr.on("data", (data) => {
                decoded += data;
            });
            proc.stdout.on("end", () => {
                this.diagnosticCollection.set(this.document.uri, this.getDiagnostics(decoded));
                fs.unlink(this.tempfilepath, () => { });
            });
        });
    }
    getTemporaryPath() {
        let configuration = vscode.workspace.getConfiguration("perl-toolbox");
        if (configuration.temporaryPath === null) {
            return os.tmpdir();
        }
        return configuration.temporaryPath;
    }
    getIncludePaths() {
        let includePaths = [];
        this.configuration.includePaths.forEach(path => {
            includePaths.push("-I");
            includePaths.push(path);
        });
        return includePaths.join(" ");
    }
    getCommandOptions() {
        return {
            shell: true,
            cwd: this.configuration.path
        };
    }
    getDiagnostics(output) {
        let diagnostics = [];
        output.split("\n").forEach(violation => {
            if (this.isValidViolation(violation)) {
                diagnostics.push(this.createDiagnostic(violation));
            }
        });
        return diagnostics;
    }
    createDiagnostic(violation) {
        return new vscode.Diagnostic(this.getRange(violation), "Syntax: " + violation, vscode.DiagnosticSeverity.Error);
    }
    getRange(violation) {
        let patt = /line\s+(\d+)/i;
        let line = patt.exec(violation)[1];
        return new vscode.Range(Number(line) - 1, 0, Number(line) - 1, Number.MAX_VALUE);
    }
    isValidViolation(violation) {
        let patt = /line\s+\d+/i;
        return patt.exec(violation);
    }
}
exports.default = PerlSyntaxProvider;
//# sourceMappingURL=PerlSyntaxProvider.js.map
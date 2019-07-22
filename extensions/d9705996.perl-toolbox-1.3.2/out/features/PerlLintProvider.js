"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");
class PerlLintProvider {
    activate(subscriptions) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection();
        vscode.workspace.onDidCloseTextDocument(textDocument => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
        vscode.workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
        vscode.workspace.onDidSaveTextDocument(this.lint, this);
        vscode.workspace.onDidCloseTextDocument(textDocument => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
    }
    dispose() {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
        this.command.dispose();
    }
    lint(textDocument) {
        this.document = textDocument;
        if (this.document.uri.scheme === "git") {
            return;
        }
        if (this.document.languageId !== "perl") {
            return;
        }
        this.configuration = vscode.workspace.getConfiguration("perl-toolbox.lint");
        if (!this.configuration.enabled) {
            return;
        }
        let decoded = "";
        this.tempfilepath =
            this.getTemporaryPath() +
                path.sep +
                path.basename(this.document.fileName) +
                ".lint";
        fs.writeFile(this.tempfilepath, this.document.getText(), () => {
            let proc = cp.spawn(this.configuration.exec, this.getCommandArguments(), this.getCommandOptions());
            proc.stdout.on("data", (data) => {
                decoded += data;
            });
            proc.stderr.on("data", (data) => {
                console.log(`stderr: ${data}`);
            });
            proc.stdout.on("end", () => {
                this.diagnosticCollection.set(this.document.uri, this.getDiagnostics(decoded));
                fs.unlink(this.tempfilepath, () => { });
            });
        });
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
        let tokens = violation.replace("~||~", "").split("~|~");
        return new vscode.Diagnostic(this.getRange(tokens), this.getMessage(tokens), this.getSeverity(tokens));
    }
    getRange(tokens) {
        if (this.configuration.highlightMode === "word") {
            return this.document.getWordRangeAtPosition(new vscode.Position(Number(tokens[1]) - 1, Number(tokens[2]) - 1), /[^\s]+/);
        }
        return new vscode.Range(Number(tokens[1]) - 1, Number(tokens[2]) - 1, Number(tokens[1]) - 1, Number.MAX_VALUE);
    }
    getMessage(tokens) {
        return ("Lint: " +
            this.getSeverityAsText(tokens[0]).toUpperCase() +
            ": " +
            tokens[3]);
    }
    getSeverityAsText(severity) {
        switch (parseInt(severity)) {
            case 5:
                return "gentle";
            case 4:
                return "stern";
            case 3:
                return "harsh";
            case 2:
                return "cruel";
            default:
                return "brutal";
        }
    }
    getSeverity(tokens) {
        switch (this.configuration[this.getSeverityAsText(tokens[0])]) {
            case "hint":
                return vscode.DiagnosticSeverity.Hint;
            case "info":
                return vscode.DiagnosticSeverity.Information;
            case "warning":
                return vscode.DiagnosticSeverity.Warning;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }
    isValidViolation(violation) {
        return violation.split("~|~").length === 6;
    }
    getCommandOptions() {
        return {
            shell: true,
            cwd: this.configuration.path
        };
    }
    getCommandArguments() {
        return [
            "--" + this.getLintSeverity(),
            this.useProfile(),
            this.getExcludedPolicies(),
            "--verbose",
            '"%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n"',
            this.tempfilepath
        ];
    }
    getExcludedPolicies() {
        let policies = [];
        this.configuration.excludedPolicies.forEach(policy => {
            policies.push("--exclude");
            policies.push(policy);
        });
        return policies.join(" ");
    }
    getTemporaryPath() {
        let configuration = vscode.workspace.getConfiguration("perl-toolbox");
        if (configuration.temporaryPath === null) {
            return os.tmpdir();
        }
        return configuration.temporaryPath;
    }
    useProfile() {
        if (!this.configuration.useProfile) {
            return "--noprofile";
        }
    }
    getLintSeverity() {
        return this.configuration.severity;
    }
}
exports.default = PerlLintProvider;
//# sourceMappingURL=PerlLintProvider.js.map
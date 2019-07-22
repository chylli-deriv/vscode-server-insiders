"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PerlLintProvider_1 = require("./features/PerlLintProvider");
const PerlSyntaxProvider_1 = require("./features/PerlSyntaxProvider");
function activate(context) {
    let linter = new PerlLintProvider_1.default();
    linter.activate(context.subscriptions);
    let checker = new PerlSyntaxProvider_1.default();
    checker.activate(context.subscriptions);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
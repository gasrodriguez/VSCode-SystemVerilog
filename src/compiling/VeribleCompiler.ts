import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as child from 'child_process';
import { DocumentCompiler } from './DocumentCompiler';
import { DiagnosticData, isDiagnosticDataUndefined } from './DiagnosticData';

/**
 * Verible Compiler class contains functionality for compiling SystemVerilog/Verilog files using Verible linter.
 * Generates and takes in predefined runtime arguments,
 * and eventually parses the errors/warnings in `stdout` into `Diagnostic` array mapped to each unique document's uri.
 */
export class VeribleCompiler extends DocumentCompiler {
    /**
        Parses `stdout` into `Diagnostics` that are added to `collection` by adding each `Diagnostic` to an array
        The array is mapped in `collection` to the referred document's uri.

        @param _error the process's error
        @param stdout the process's stdout
        @param _stderr the process's stderr
        @param compiledDocument the document been compiled
        @param documentFilePath the `document`'s file path
        @param collection the collection to add the Diagnostics to
        @returns a message if an error occurred.
    */
    public parseDiagnostics(
        _error: child.ExecException,
        stdout: string,
        _stderr: string,
        compiledDocument: TextDocument,
        documentFilePath: string,
        collection: Map<string, Diagnostic[]>
    ): void {
        if (stdout === undefined || stdout == null || !compiledDocument) {
            return;
        }
        const lines = stdout.toString().split('\n');
        const visitedDocuments = new Map<string, boolean>();
        lines.forEach((line, i) => {
            const [_, lineStr, colStr, ...message] = line.split(':');
            const lineNum = Number(lineStr) - 1;
            const colNum = Number(colStr) - 1;
            const messageStr = message.join(':');

            const diagnosticData: DiagnosticData = new DiagnosticData();
            diagnosticData.filePath = documentFilePath;
            diagnosticData.line = lineNum;
            diagnosticData.charPosition = colNum;
            if (message && messageStr.search('error') === -1) {
                diagnosticData.diagnosticSeverity = DiagnosticSeverity.Warning;
            } else {
                diagnosticData.diagnosticSeverity = DiagnosticSeverity.Error;
            }
            diagnosticData.problem = messageStr;

            // Push Diagnostic
            if (!isDiagnosticDataUndefined(diagnosticData)) {
                if (visitedDocuments.has(diagnosticData.filePath)) {
                    this.publishDiagnosticForDocument(compiledDocument, false, diagnosticData, collection);
                } else {
                    this.publishDiagnosticForDocument(compiledDocument, true, diagnosticData, collection);
                    visitedDocuments.set(diagnosticData.filePath, true);
                }
            }
        });
    }
}

import { ParserHelpers } from './helpers.js';
import PARSER from './parser.js';
import type * as ast from './types/ast.js';
import type { BaseNode } from './types/types.js';
import WhitespaceControl from './whitespace-control.js';

const parser = PARSER as {
  parse: (input: string) => ast.Program;
  yy: ParserHelpers;
};

export function parseWithoutProcessing<T extends ast.VisitableNode>(
  input: string | T,
  options: ParseOptions = {}
) {
  // Just return if an already-compiled AST was passed in.
  if (typeof input !== 'string') {
    return input;
  }

  parser.yy = new ParserHelpers(options);

  return parser.parse(input);
}

export function parse<T extends ast.VisitableNode>(
  input: string | T,
  options: ParseOptions = {}
) {
  let ast = parseWithoutProcessing(input, options);
  let strip = new WhitespaceControl(options);

  // @ts-expect-error
  return strip.accept(ast);
}
export interface ParseOptions {
  srcName?: string;
  syntax?: SyntaxOptions;
}

export interface SyntaxOptions {
  hash?:
    | 'node'
    | ((
        hash: ast.Hash,
        loc: ast.SourceLocation,
        options: SyntaxFnOptions
      ) => BaseNode);
  square?:
    | 'string'
    | 'node'
    | ((
        params: ast.Expr[],
        loc: ast.SourceLocation,
        options: SyntaxFnOptions
      ) => BaseNode);
}

export interface SyntaxFnOptions {
  yy: ParserHelpers;
}

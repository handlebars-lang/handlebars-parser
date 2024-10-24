import Exception from './exception.js';
import type {
  CloseBlock,
  InverseChain,
  LocInfo,
  OpenBlock,
  OpenPartialBlock,
  OpenRawBlock,
  Part,
  SourcePosition,
} from './types/types.js';
import type * as ast from './types/ast.js';
import { assert } from './utils.js';
import type { ParseOptions, SyntaxOptions } from './parse.js';

export class ParserHelpers {
  #options: ParseOptions;
  readonly syntax: SyntaxOptions;

  constructor(options: ParseOptions) {
    this.#options = options;

    let squareSyntax;

    if (typeof options?.syntax?.square === 'function') {
      squareSyntax = options.syntax.square;
    } else if (options?.syntax?.square === 'node') {
      squareSyntax = arrayLiteralNode;
    } else {
      squareSyntax = 'string';
    }

    let hashSyntax;

    if (typeof options?.syntax?.hash === 'function') {
      hashSyntax = options.syntax.hash;
    } else {
      hashSyntax = hashLiteralNode;
    }

    this.syntax = {
      square: squareSyntax,
      hash: hashSyntax,
    };
  }

  locInfo = (locInfo: LocInfo) => {
    return new SourceLocation(this.#options.srcName, locInfo);
  };

  id = (token: string) => {
    if (/^\[.*\]$/.test(token)) {
      return token.substring(1, token.length - 1);
    } else {
      return token;
    }
  };

  stripFlags = (open: string, close: string) => {
    return {
      open: open.charAt(2) === '~',
      close: close.charAt(close.length - 3) === '~',
    };
  };

  stripComment = (comment: string) => {
    return comment.replace(/^\{\{~?!-?-?/, '').replace(/-?-?~?\}\}$/, '');
  };

  preparePath = (
    data: boolean,
    sexpr: ast.PathExpression | false,
    parts: Part[],
    locInfo: LocInfo
  ) => {
    const loc = this.locInfo(locInfo);

    let original;

    if (data) {
      original = '@';
    } else if (sexpr) {
      original = sexpr.original + '.';
    } else {
      original = '';
    }

    let tail = [];
    let depth = 0;

    for (let i = 0, l = parts.length; i < l; i++) {
      let part = parts[i].part;
      // If we have [] syntax then we do not treat path references as operators,
      // i.e. foo.[this] resolves to approximately context.foo['this']
      let isLiteral = parts[i].original !== part;
      let separator = parts[i].separator;

      let partPrefix = separator === '.#' ? '#' : '';

      original += (separator || '') + part;

      if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
        if (tail.length > 0) {
          throw new Exception('Invalid path: ' + original, { loc });
        } else if (part === '..') {
          depth++;
        }
      } else {
        tail.push(`${partPrefix}${part}`);
      }
    }

    let head = sexpr || tail.shift();

    return {
      type: 'PathExpression',
      this: original.startsWith('this.'),
      data,
      depth,
      head,
      tail,
      parts: head ? [head, ...tail] : tail,
      original,
      loc,
    };
  };

  prepareMustache = (
    path: ast.PathExpression,
    params: ast.Expr[],
    hash: ast.Hash,
    openToken: string,
    strip: ast.StripFlags,
    locInfo: LocInfo
  ) => {
    // Must use charAt to support IE pre-10
    let escapeFlag = openToken.charAt(3) || openToken.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

    let decorator = /\*/.test(openToken);
    return {
      type: decorator ? 'Decorator' : 'MustacheStatement',
      path,
      params,
      hash,
      escaped,
      strip,
      loc: this.locInfo(locInfo),
    };
  };

  prepareRawBlock = (
    openRawBlock: OpenRawBlock,
    contents: ast.Statement[],
    closeToken: string,
    locInfo: LocInfo
  ): ast.BlockStatement => {
    validateClose(openRawBlock, closeToken);

    const loc = this.locInfo(locInfo);
    let program: ast.Program = {
      type: 'Program',
      body: contents,
      strip: {},
      loc,
    };

    assert(openRawBlock.path.type === 'PathExpression', 'Mustache path');

    return {
      type: 'BlockStatement',
      path: openRawBlock.path,
      params: openRawBlock.params,
      hash: openRawBlock.hash,
      program,
      openStrip: {},
      inverseStrip: {},
      closeStrip: {},
      loc,
    };
  };

  prepareBlock = (
    openBlock: OpenBlock,
    program: ast.Program,
    inverseAndProgram: InverseChain,
    close: CloseBlock,
    inverted: boolean,
    locInfo: LocInfo
  ) => {
    if (close && close.path) {
      validateClose(openBlock, close);
    }

    let decorator = /\*/.test(openBlock.open);

    program.blockParams = openBlock.blockParams;

    let inverse, inverseStrip;

    if (inverseAndProgram) {
      if (decorator) {
        throw new Exception(
          'Unexpected inverse block on decorator',
          inverseAndProgram
        );
      }

      if (inverseAndProgram.chain) {
        const first = inverseAndProgram.program.body[0];

        assert(
          first.type === 'BlockStatement',
          `BUG: the first statement after an 'else' chain must be a block statement. This should be enforced by the parser and this error should never occur.`
        );

        if (first.type === 'BlockStatement') {
          first.closeStrip = close.strip;
        }
      }

      inverseStrip = inverseAndProgram.strip;
      inverse = inverseAndProgram.program;
    }

    if (inverted) {
      const initialInverse = inverse as ast.Program;
      inverse = program;
      program = initialInverse;
    }

    return {
      type: decorator ? 'DecoratorBlock' : 'BlockStatement',
      path: openBlock.path,
      params: openBlock.params,
      hash: openBlock.hash,
      program,
      inverse,
      openStrip: openBlock.strip,
      inverseStrip,
      closeStrip: close && close.strip,
      loc: this.locInfo(locInfo),
    };
  };

  prepareProgram = (statements: ast.Statement[], loc?: ast.SourceLocation) => {
    if (!loc && statements.length) {
      const firstLoc = statements[0].loc;
      const lastLoc = statements[statements.length - 1].loc;

      if (firstLoc === lastLoc) {
        loc = firstLoc;
      } else {
        loc = new SourceLocation(firstLoc.source, {
          first_line: firstLoc.start.line,
          first_column: firstLoc.start.column,
          last_line: lastLoc.end.line,
          last_column: lastLoc.end.column,
        });
      }
    }

    return {
      type: 'Program',
      body: statements,
      strip: {},
      loc,
    };
  };

  preparePartialBlock = (
    open: OpenPartialBlock,
    program: ast.Program,
    close: CloseBlock,
    locInfo: LocInfo
  ) => {
    validateClose(open, close);

    return {
      type: 'PartialBlockStatement',
      name: open.path,
      params: open.params,
      hash: open.hash,
      program,
      openStrip: open.strip,
      closeStrip: close && close.strip,
      loc: this.locInfo(locInfo),
    };
  };
}

function validateClose(
  open: OpenBlock | OpenRawBlock | OpenPartialBlock,
  close: CloseBlock | string
) {
  const closeString = typeof close === 'string' ? close : close.path.original;

  if (open.path.type !== 'PathExpression') {
    throw new Exception(`Unexpected block open (expected a path)`, open.path);
  }

  if (open.path.original !== closeString) {
    throw new Exception(
      `${open.path.original} doesn't match ${closeString}`,
      open.path
    );
  }
}

export class SourceLocation implements ast.SourceLocation {
  source: string | undefined;
  start: SourcePosition;
  end: SourcePosition;

  constructor(source: string | undefined, locInfo: LocInfo) {
    this.source = source;
    this.start = {
      line: locInfo.first_line,
      column: locInfo.first_column,
    };
    this.end = {
      line: locInfo.last_line,
      column: locInfo.last_column,
    };
  }
}

function arrayLiteralNode(
  array: ast.Expr[],
  loc: ast.SourceLocation
): ast.ArrayLiteral {
  return {
    type: 'ArrayLiteral',
    items: array,
    loc,
  };
}

function hashLiteralNode(
  hash: ast.Hash,
  loc: ast.SourceLocation
): ast.HashLiteral {
  return {
    type: 'HashLiteral',
    pairs: hash.pairs,
    loc,
  };
}

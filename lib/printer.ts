import Visitor from './visitor.js';
import type * as ast from './types/ast.js';

export function print(ast: ast.VisitableNode) {
  return new PrintVisitor().accept(ast);
}

export class PrintVisitor extends Visitor {
  padding = 0;

  pad(string: string) {
    let out = '';

    for (let i = 0, l = this.padding; i < l; i++) {
      out += '  ';
    }

    out += string + '\n';
    return out;
  }

  Program(program: ast.Program) {
    let out = '',
      body = program.body,
      i,
      l;

    if (program.blockParams) {
      let blockParams = 'BLOCK PARAMS: [';
      for (i = 0, l = program.blockParams.length; i < l; i++) {
        blockParams += ' ' + program.blockParams[i];
      }
      blockParams += ' ]';
      out += this.pad(blockParams);
    }

    for (i = 0, l = body.length; i < l; i++) {
      out += this.accept(body[i]);
    }

    this.padding--;

    return out;
  }

  MustacheStatement(mustache: ast.MustacheStatement) {
    return this.pad('{{ ' + this.callNode(mustache) + ' }}');
  }

  Decorator(mustache: ast.Decorator) {
    return this.pad('{{ DIRECTIVE ' + this.callNode(mustache) + ' }}');
  }

  BlockStatement(block: ast.BlockStatement): string {
    return this.#BlockStatement(block);
  }

  DecoratorBlock(block: ast.DecoratorBlock): string {
    return this.#BlockStatement(block);
  }

  #BlockStatement(block: ast.BlockStatement | ast.DecoratorBlock) {
    let out = '';

    out += this.pad(
      (block.type === 'DecoratorBlock' ? 'DIRECTIVE ' : '') + 'BLOCK:'
    );
    this.padding++;
    out += this.pad(this.callNode(block));
    if (block.program) {
      out += this.pad('PROGRAM:');
      this.padding++;
      out += this.accept(block.program);
      this.padding--;
    }
    if (block.inverse) {
      if (block.program) {
        this.padding++;
      }
      out += this.pad('{{^}}');
      this.padding++;
      out += this.accept(block.inverse);
      this.padding--;
      if (block.program) {
        this.padding--;
      }
    }
    this.padding--;

    return out;
  }

  PartialStatement(partial: ast.PartialStatement) {
    // @ts-expect-error
    let content = 'PARTIAL:' + partial.name.original;
    if (partial.params[0]) {
      content += ' ' + this.accept(partial.params[0]);
    }
    if (partial.hash) {
      content += ' ' + this.accept(partial.hash);
    }
    return this.pad('{{> ' + content + ' }}');
  }

  PartialBlockStatement(partial: ast.PartialBlockStatement) {
    // @ts-expect-error
    let content = 'PARTIAL BLOCK:' + partial.name.original;
    if (partial.params[0]) {
      content += ' ' + this.accept(partial.params[0]);
    }
    if (partial.hash) {
      content += ' ' + this.accept(partial.hash);
    }

    content += ' ' + this.pad('PROGRAM:');
    this.padding++;
    content += this.accept(partial.program);
    this.padding--;

    return this.pad('{{> ' + content + ' }}');
  }

  ContentStatement(content: ast.ContentStatement) {
    return this.pad("CONTENT[ '" + content.value + "' ]");
  }

  CommentStatement(comment: ast.CommentStatement) {
    return this.pad("{{! '" + comment.value + "' }}");
  }

  SubExpression(subExpression: ast.SubExpression) {
    return this.callNode(subExpression);
  }

  callNode(sexpr: ast.CallNode) {
    const params = sexpr.params;
    const paramStrings = [];

    for (let i = 0, l = params.length; i < l; i++) {
      paramStrings.push(this.accept(params[i]));
    }

    const paramsString = '[' + paramStrings.join(', ') + ']';
    const hashString = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

    return `${this.accept(sexpr.path)} ${paramsString}${hashString}`;
  }

  PathExpression(id: ast.PathExpression) {
    let head =
      typeof id.head === 'string' ? id.head : `[${this.accept(id.head)}]`;
    let path = [head, ...id.tail].join('/');
    return 'p%' + prefix(id) + path;
  }

  StringLiteral(string: ast.StringLiteral) {
    return '"' + string.value + '"';
  }

  NumberLiteral(number: ast.NumberLiteral) {
    return 'n%' + number.value;
  }

  BooleanLiteral(bool: ast.BooleanLiteral) {
    return 'b%' + bool.value;
  }

  UndefinedLiteral() {
    return 'UNDEFINED';
  }

  NullLiteral() {
    return 'NULL';
  }

  Hash(hash: ast.Hash) {
    let pairs = hash.pairs,
      joinedPairs = [];

    for (let i = 0, l = pairs.length; i < l; i++) {
      joinedPairs.push(this.accept(pairs[i]));
    }

    return 'HASH{' + joinedPairs.join(' ') + '}';
  }

  HashPair(pair: ast.HashPair) {
    return pair.key + '=' + this.accept(pair.value);
  }
}

function prefix(path: ast.PathExpression) {
  if (path.data) {
    return '@';
  } else if (path.this) {
    return 'this.';
  } else {
    return '';
  }
}

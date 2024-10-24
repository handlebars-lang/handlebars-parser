import Exception from './exception.js';
import type * as ast from './types/ast.js';

export default class Visitor {
  parents: ast.VisitableNode[] = [];
  mutating = false;
  current: ast.VisitableNode | undefined;

  acceptField<N extends ast.VisitableNode>(node: N, name: keyof N): void {
    this.#acceptKey(node, name, node);
  }

  acceptItem(
    array: ast.VisitableNode[],
    item: number,
    parent: ast.VisitableNode
  ): void {
    this.#acceptKey(array, item, parent);
  }

  #acceptKey(
    container: ast.VisitableNode | ast.VisitableNode[],
    name: string | symbol | number,
    parent: ast.VisitableNode
  ) {
    const node = Reflect.get(container, name) as ast.VisitableNode;
    let value = this.accept(node);

    if (this.mutating) {
      if (isObject(value) && !this.#isVisitable(value)) {
        throw new Exception(
          `${unexpectedVisitorReturn(value)} when accepting ${String(
            name
          )} on ${parent.type}`,
          node
        );
      }
      Reflect.set(container, name, value);
    }
  }

  acceptRequired<N extends ast.VisitableNode>(
    node: N,
    name: ast.VisitableChildren[N['type']]
  ): void {
    const original = node[name] as ast.VisitableNode;
    this.acceptField(node, name);

    if (!node[name]) {
      throw new Exception(
        `Visitor removed \`${name}\` (${original.loc.start.line}:${original.loc.start.column}) from ${node.type}, but \`${name}\` is required`,
        node
      );
    }
  }

  // Traverses a given array. If mutating, empty responses will be removed
  // for child elements.
  acceptArray(array: ast.VisitableNode[], parent: ast.VisitableNode) {
    for (let i = 0, l = array.length; i < l; i++) {
      this.#acceptKey(array, i, parent);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  }

  accept(node: ast.VisitableNode | null | undefined): unknown {
    const obj = node;

    if (!obj) {
      return undefined;
    }

    if (!this[obj.type]) {
      throw new Exception('Unknown type: ' + obj.type, obj);
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }

    this.current = obj;

    const visit = this[obj.type] as (
      node: typeof obj
    ) => ReturnType<this[NonNullable<typeof obj>['type']]>;

    let ret = visit.call(this, obj);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return obj;
    } else {
      return;
    }
  }

  Program(program: ast.Program): unknown {
    this.acceptArray(program.body, program);
    return;
  }

  MustacheStatement(mustache: ast.MustacheStatement): unknown {
    this.#visitCallNode(mustache);
    return;
  }

  Decorator(mustache: ast.Decorator): unknown {
    this.#visitCallNode(mustache);
    return;
  }

  BlockStatement(block: ast.BlockStatement): unknown {
    this.#visitBlock(block);
    return;
  }

  DecoratorBlock(block: ast.DecoratorBlock): unknown {
    this.#visitBlock(block);
    return;
  }

  PartialStatement(partial: ast.PartialStatement): unknown {
    this.#visitPartial(partial);
    return;
  }

  PartialBlockStatement(partial: ast.PartialBlockStatement): unknown {
    this.#visitPartial(partial);
    this.acceptField(partial, 'program');
    return;
  }

  ContentStatement(_content: ast.ContentStatement): unknown {
    return;
  }

  CommentStatement(_comment: ast.CommentStatement): unknown {
    return;
  }

  SubExpression(sexpr: ast.SubExpression): unknown;
  /**
   * Passing a `CallNode` to `SubExpression` is deprecated.
   *
   * @deprecated Call {@linkcode callNode} instead of SubExpression if you aren't passing a SubExpression.
   */
  SubExpression(sexpr: ast.CallNode): unknown;
  SubExpression(sexpr: ast.CallNode): unknown {
    this.#visitCallNode(sexpr);
    return;
  }

  PathExpression(_path: ast.PathExpression): unknown {
    return;
  }

  StringLiteral(_string: ast.StringLiteral): unknown {
    return;
  }

  NumberLiteral(_number: ast.NumberLiteral): unknown {
    return;
  }

  BooleanLiteral(_boolean: ast.BooleanLiteral): unknown {
    return;
  }

  UndefinedLiteral(_undefined: ast.UndefinedLiteral): unknown {
    return;
  }

  NullLiteral(_null: ast.NullLiteral): unknown {
    return;
  }

  ArrayLiteral(array: ast.ArrayLiteral): unknown {
    this.acceptArray(array.items, array);
    return;
  }

  HashLiteral(hash: ast.HashLiteral): unknown {
    this.acceptArray(hash.pairs, hash);
    return;
  }

  Hash(hash: ast.Hash): unknown {
    this.acceptArray(hash.pairs, hash);
    return;
  }

  HashPair(pair: ast.HashPair): unknown {
    this.acceptRequired(pair, 'value');
    return;
  }

  #visitCallNode(
    mustache:
      | ast.SubExpression
      | ast.MustacheStatement
      | ast.Decorator
      | ast.BlockStatement
      | ast.DecoratorBlock
  ) {
    this.acceptRequired(mustache, 'path');
    this.acceptArray(mustache.params, mustache);
    this.acceptField(mustache, 'hash');
  }

  #visitBlock(block: ast.BlockStatement | ast.DecoratorBlock) {
    this.#visitCallNode(block);

    this.acceptField(block, 'program');
    this.acceptField(block, 'inverse');
  }

  #visitPartial(partial: ast.PartialStatement | ast.PartialBlockStatement) {
    this.acceptRequired(partial, 'name');
    this.acceptArray(partial.params, partial);
    this.acceptField(partial, 'hash');
  }

  #isVisitable(obj: VisitorReturn): obj is ast.Node {
    const type = Reflect.get(obj, 'type');
    if (type === undefined || typeof type !== 'string') {
      return false;
    }

    return Reflect.has(this, type);
  }
}

type VisitorReturn = { type?: unknown };

function isObject(obj: unknown): obj is VisitorReturn {
  return !!obj;
}

function unexpectedVisitorReturn(value: VisitorReturn) {
  if (value.type === undefined) {
    return `Unexpected visitor return value (no 'type' property)`;
  } else if (typeof value.type !== 'string') {
    return `Unexpected visitor return value (type is ${
      value.type === null ? 'null' : typeof value.type
    }, not a string)`;
  } else {
    return `Unexpected visitor return value (type of "${value.type}" is not a visitable node type)`;
  }
}

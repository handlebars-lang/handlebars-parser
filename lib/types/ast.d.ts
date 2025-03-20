export type Literal = CollectionLiteral | PrimitiveLiteral;
export type PrimitiveLiteral =
  | StringLiteral
  | BooleanLiteral
  | NumberLiteral
  | UndefinedLiteral
  | NullLiteral;
export type Statement =
  | MustacheStatement
  | Decorator
  | BlockStatement
  | PartialStatement
  | ContentStatement
  | CommentStatement;
export type CollectionLiteral = HashLiteral | ArrayLiteral;
export type Expr = SubExpression | PathExpression | Literal;
export type Internal = Hash | HashPair;
export type CallNode =
  | SubExpression
  | MustacheStatement
  | Decorator
  | BlockStatement
  | DecoratorBlock;

export type VisitableNode =
  | Program
  | MustacheStatement
  | Decorator
  | BlockStatement
  | DecoratorBlock
  | PartialStatement
  | PartialBlockStatement
  | ContentStatement
  | CommentStatement
  | SubExpression
  | PathExpression
  | Literal
  | Internal;

export type VisitableChildren = {
  [P in VisitableNode['type']]: Extract<
    VisitableNode,
    { type: P }
  > extends infer N
    ? {
        [K in keyof N]: N[K] extends VisitableNode ? K : never;
      }[keyof N] &
        string
    : never;
};

export interface HasLocation {
  loc: SourceLocation;
}

export interface Node extends HasLocation {
  type: string;
}

export interface SourceLocation {
  source?: string | undefined;
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface Program extends Node {
  type: 'Program';
  body: Statement[];
  blockParams?: string[];
  /** @compat */
  strip: {};
  chained?: boolean;
}

export interface BaseStatement extends Node {}

export interface MustacheStatement extends BaseStatement, WithArgsNode {
  type: 'MustacheStatement';
  path: CollectionLiteral | SubExpression | PathExpression;
  escaped: boolean;
  strip: StripFlags;
}

export interface Decorator extends MustacheStatement {}

export interface BaseBlockStatement extends BaseStatement, WithArgsNode {
  /**
   * This is very restricted compared to other call nodes
   * because the opening path must be repeated as part of
   * the block close (i.e. {{#foo}}{{/foo}}).
   */
  path: PathExpression;
  program: Program;
  inverse?: Program;
  openStrip: StripFlags;
  inverseStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface BlockStatement extends BaseBlockStatement {
  type: 'BlockStatement';
}

export interface DecoratorBlock extends BaseBlockStatement {
  type: 'DecoratorBlock';
}

export interface PartialStatement extends BaseStatement, WithArgsNode {
  type: 'PartialStatement';
  name: PathExpression | SubExpression;
  indent: string;
  strip: StripFlags;
}

export interface PartialBlockStatement extends BaseBlockStatement {
  type: 'PartialBlockStatement';
  name: PathExpression | SubExpression;
  program: Program;
  openStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface ContentStatement extends BaseStatement {
  type: 'ContentStatement';
  value: string;
  original: string;
  rightStripped?: boolean;
  leftStripped?: boolean;
}

export interface CommentStatement extends BaseStatement {
  type: 'CommentStatement';
  value: string;
  strip: StripFlags;
}

export interface BaseExpression extends Node {}

export interface SubExpression extends BaseExpression, WithArgsNode {
  type: 'SubExpression';
  path: CollectionLiteral | SubExpression | PathExpression;
}

export interface PathExpression extends BaseExpression {
  type: 'PathExpression';
  data: boolean;
  this: boolean;
  depth: number;
  parts: (string | SubExpression)[];
  head: SubExpression | string;
  tail: string[];
  original: string;
}

export interface BasePrimitiveLiteral extends BaseExpression {}

export interface StringLiteral extends BasePrimitiveLiteral {
  type: 'StringLiteral';
  value: string;
  original: string;
}

export interface BooleanLiteral extends BasePrimitiveLiteral {
  type: 'BooleanLiteral';
  value: boolean;
  original: boolean;
}

export interface NumberLiteral extends BasePrimitiveLiteral {
  type: 'NumberLiteral';
  value: number;
  original: number;
}

export interface UndefinedLiteral extends BasePrimitiveLiteral {
  type: 'UndefinedLiteral';
}

export interface NullLiteral extends BasePrimitiveLiteral {
  type: 'NullLiteral';
}

export interface Hash extends Node {
  type: 'Hash';
  pairs: HashPair[];
}

export interface BaseCollectionLiteral extends BaseExpression {}

export interface HashLiteral extends BaseCollectionLiteral {
  type: 'HashLiteral';
  pairs: HashPair[];
}

export interface ArrayLiteral extends BaseCollectionLiteral {
  type: 'ArrayLiteral';
  items: Expr[];
}

export interface HashPair extends Node {
  type: 'HashPair';
  key: string;
  value: Expr;
}

export interface StripFlags {
  open?: boolean;
  close?: boolean;
  openStandalone?: boolean;
  closeStandalone?: boolean;
  inlineStandalone?: boolean;
}

export interface WithArgsNode {
  params: Expr[];
  hash: Hash;
}

export interface helpers {
  helperExpression(node: Node): boolean;
  scopeId(path: PathExpression): boolean;
  simpleId(path: PathExpression): boolean;
}

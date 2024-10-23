export interface BaseNode {
  type: string;
  loc: SourceLocation;
}

export interface InverseChain {
  strip: StripFlags;
  program: Program;
  chain?: boolean;
}

export interface Program {
  type: 'Program';
  /**
   * The root node of a program has no `loc` if it's empty.
   */
  loc: SourceLocation | undefined;
  blockParams?: string[];
  body: Statement[];
  chained?: boolean;
  strip: StripFlags;
}

export interface CommentStatement extends BaseNode {
  type: 'CommentStatement';
  value: string;
  strip: StripFlags;
}

export interface PartialStatement extends BaseNode {
  type: 'PartialStatement';
  name: Expression;
  params: Expression[];
  hash: Hash;
  indent: string;
  strip: StripFlags;
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  path: Expression;
  params: Expression[];
  hash: Hash;
  program: Program | undefined;
  inverse?: Program | undefined;
  openStrip: StripFlags;
  inverseStrip: StripFlags | undefined;
  closeStrip: StripFlags;
}

export interface DecoratorBlock extends BaseNode {
  type: 'DecoratorBlock';
  path: Expression;
  params: Expression[];
  hash: Hash;
  program: Program;
  inverse?: undefined;
  inverseStrip?: undefined;
  openStrip: StripFlags;
  closeStrip: StripFlags;
}

export interface PartialBlockStatement extends BaseNode {
  type: 'PartialBlockStatement';
  name: Expression;
  params: Expression[];
  hash: Hash;
  program: Program;
  inverse?: undefined;
  inverseStrip?: undefined;
  openStrip: StripFlags;
  closeStrip: StripFlags;
}

export type Statement =
  | MustacheStatement
  | Content
  | BlockStatement
  | PartialStatement
  | PartialBlockStatement;

export interface MustacheStatement extends BaseNode {
  type: 'Decorator' | 'MustacheStatement';
  path: Expression;
  params: Expression[];
  hash: Hash;
  escaped: boolean;
  strip: StripFlags;
}

export interface PathExpression extends BaseNode {
  readonly original: string;
  readonly this: boolean;
  readonly data: boolean;
  readonly depth: number;
  readonly parts: (string | SubExpression)[];
  readonly head: string | SubExpression | undefined;
  readonly tail: string[];
}

export interface SubExpression extends BaseNode {
  readonly original: string;
}

export interface Hash {
  readonly pairs: HashPair[];
}

export interface StripFlags {
  readonly open?: boolean;
  readonly close?: boolean;
  readonly openStandalone?: boolean;
  readonly closeStandalone?: boolean;
  readonly inlineStandalone?: boolean;
}

export interface HashPair {
  readonly key: string;
  readonly value: Expression;
}

export interface ParserPart {
  readonly part: string;
  readonly original: string;
  readonly separator: string;
}

export interface Content extends BaseNode {
  type: 'ContentStatement';
  original: string;
  value: string;
}

export type Expression = SubExpression | PathExpression;

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceLocation {
  source: string | undefined;
  start: SourcePosition;
  end: SourcePosition;
}

export interface CallNode {
  path: Expression;
  params: Expression[];
  hash: Hash;
}

export interface OpenPartial {
  strip: StripFlags;
}

export interface OpenPartialBlock extends CallNode {
  strip: StripFlags;
}

export interface OpenRawBlock extends CallNode, BaseNode {}

export interface OpenBlock extends CallNode {
  open: string;
  blockParams: string[];
  strip: StripFlags;
}

export interface OpenInverse extends CallNode {
  blockParams: string[];
  strip: StripFlags;
}

export interface CloseBlock {
  readonly path: PathExpression;
  strip: StripFlags;
}

export type AcceptedNode = Program;

/// JISON TYPES ///

export interface Parser {
  parse: (input: string) => Program;
  yy: YY;
}

export interface YY {
  locInfo(locInfo: LocInfo): SourceLocation;
  preparePath(
    this: YY,
    data: boolean,
    sexpr: { expr: SubExpression; sep: string } | false,
    parts: ParserPart[],
    locInfo: LocInfo,
  ): PathExpression;

  prepareMustache(
    this: YY,
    path: PathExpression,
    params: Expression[],
    hash: Hash,
    open: string,
    strip: StripFlags,
    locInfo: LocInfo,
  ): MustacheStatement;

  prepareRawBlock(
    this: YY,
    openRawBlock: OpenRawBlock,
    contents: Content[],
    close: string,
    locInfo: LocInfo,
  ): BlockStatement;

  prepareBlock(
    this: YY,
    openBlock: OpenBlock,
    program: Program,
    inverseChain: InverseChain,
    close: CloseBlock,
    inverted: boolean,
    locInfo: LocInfo,
  ): BlockStatement | DecoratorBlock;
}

/**
 * The `LocInfo` object comes from the generated `jison` parser.
 */
export interface LocInfo {
  first_line: number;
  first_column: number;
  last_line: number;
  last_column: number;
}

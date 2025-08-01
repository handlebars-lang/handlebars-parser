import Visitor from './visitor.js';
import type * as ast from './types/ast.js';

interface WhitespaceControlOptions {
  ignoreStandalone?: boolean;
}

export default class WhitespaceControl extends Visitor {
  options: WhitespaceControlOptions;
  isRootSeen = false;

  constructor(options: WhitespaceControlOptions) {
    super();
    this.options = options;
  }

  Program(program: ast.Program) {
    const doStandalone = !this.options.ignoreStandalone;

    let isRoot = !this.isRootSeen;
    this.isRootSeen = true;

    let body = program.body;
    for (let i = 0, l = body.length; i < l; i++) {
      let current = body[i];
      const strip = this.accept(current) as ast.StripFlags | undefined;

      if (!strip) {
        continue;
      }

      let _isPrevWhitespace = isPrevWhitespace(body, i, isRoot);
      let _isNextWhitespace = isNextWhitespace(body, i, isRoot);
      let openStandalone = strip.openStandalone && _isPrevWhitespace;
      let closeStandalone = strip.closeStandalone && _isNextWhitespace;
      let inlineStandalone =
        strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

      if (strip.close) {
        omitRight(body, i, true);
      }

      if (strip.open) {
        omitLeft(body, i, true);
      }

      if (doStandalone && inlineStandalone) {
        omitRight(body, i);

        if (omitLeft(body, i)) {
          // If we are on a standalone node, save the indent info for partials
          if (current.type === 'PartialStatement') {
            // Pull out the whitespace from the final line
            // @ts-expect-error
            current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
          }
        }
      }
      if (doStandalone && openStandalone) {
        // @ts-expect-error
        omitRight((current.program || current.inverse).body);

        // Strip out the previous content node if it's whitespace only
        omitLeft(body, i);
      }
      if (doStandalone && closeStandalone) {
        // Always strip the next node
        omitRight(body, i);

        // @ts-expect-error
        omitLeft((current.inverse || current.program).body);
      }
    }

    return program;
  }

  BlockStatement(block: ast.BlockStatement) {
    return this.#blockStatement(block);
  }

  DecoratorBlock(block: ast.DecoratorBlock) {
    return this.#blockStatement(block);
  }

  PartialBlockStatement(block: ast.PartialBlockStatement) {
    return this.#blockStatement(block);
  }

  #blockStatement(
    block: ast.PartialBlockStatement | ast.BlockStatement | ast.DecoratorBlock
  ) {
    this.accept(block.program);
    this.accept(block.inverse);

    // Find the inverse program that is involved with whitespace stripping.
    let program = block.program || block.inverse;
    let inverse = block.program && block.inverse;
    let firstInverse = inverse;
    let lastInverse = inverse;

    if (inverse?.chained) {
      // @ts-expect-error
      firstInverse = inverse.body[0].program;

      // Walk the inverse chain to find the last inverse that is actually in the chain.
      while (lastInverse?.chained) {
        // @ts-expect-error
        lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
      }
    }

    let strip = {
      open: block.openStrip.open,
      close: block.closeStrip.close,

      // Determine the standalone candidacy. Basically flag our content as being possibly standalone
      // so our parent can determine if we actually are standalone
      openStandalone: isNextWhitespace(program.body),
      closeStandalone: isPrevWhitespace((firstInverse || program).body),
    };

    if (block.openStrip.close) {
      omitRight(program.body, null, true);
    }

    if (inverse) {
      let inverseStrip = block.inverseStrip;

      if (inverseStrip?.open) {
        omitLeft(program.body, null, true);
      }

      if (inverseStrip?.close && firstInverse) {
        omitRight(firstInverse.body, null, true);
      }
      if (block.closeStrip.open && lastInverse) {
        omitLeft(lastInverse.body, null, true);
      }

      // Find standalone else statements
      if (
        !this.options.ignoreStandalone &&
        isPrevWhitespace(program.body) &&
        // @ts-expect-error
        isNextWhitespace(firstInverse.body)
      ) {
        omitLeft(program.body);
        // @ts-expect-error
        omitRight(firstInverse.body);
      }
    } else if (block.closeStrip.open) {
      omitLeft(program.body, null, true);
    }

    return strip;
  }

  Decorator(node: ast.Decorator) {
    return node.strip;
  }

  MustacheStatement(node: ast.MustacheStatement) {
    return node.strip;
  }

  PartialStatement(node: ast.PartialStatement) {
    return this.#statement(node);
  }

  CommentStatement(node: ast.CommentStatement) {
    return this.#statement(node);
  }

  #statement(node: ast.PartialStatement | ast.CommentStatement) {
    let strip = node.strip || {};
    return {
      inlineStandalone: true,
      open: strip.open,
      close: strip.close,
    };
  }
}

function isPrevWhitespace(body: ast.Statement[], i?: number, isRoot?: boolean) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  let prev = body[i - 1],
    sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(
      prev.original
    );
  }
}

function isNextWhitespace(body: ast.Statement[], i?: number, isRoot?: boolean) {
  if (i === undefined) {
    i = -1;
  }

  let next = body[i + 1],
    sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(
      next.original
    );
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If multiple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(
  body: ast.Statement[],
  i?: number | null,
  multiple?: boolean
) {
  let current = body[i == null ? 0 : i + 1];
  if (
    !current ||
    current.type !== 'ContentStatement' ||
    (!multiple && current.rightStripped)
  ) {
    return;
  }

  let original = current.value;
  current.value = current.value.replace(
    multiple ? /^\s+/ : /^[ \t]*\r?\n?/,
    ''
  );

  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If multiple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(
  body: ast.Statement[],
  i?: number | null,
  multiple?: boolean
) {
  let current = body[i == null ? body.length - 1 : i - 1];
  if (
    !current ||
    current.type !== 'ContentStatement' ||
    (!multiple && current.leftStripped)
  ) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceded by a non-content node.
  let original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

// export default WhitespaceControl;

function hasInverse(
  block: ast.PartialBlockStatement | ast.BlockStatement | ast.DecoratorBlock
) {}

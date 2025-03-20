import { parse, print } from '../dist/esm/index.js';

let AssertError;
if (Error.captureStackTrace) {
  AssertError = function AssertError(message, caller) {
    Error.prototype.constructor.call(this, message);
    this.message = message;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, caller || AssertError);
    }
  };

  AssertError.prototype = new Error();
} else {
  AssertError = Error;
}

/**
 * @todo Use chai's expect-style API instead (`expect(actualValue).to.equal(expectedValue)`)
 * @see https://www.chaijs.com/api/bdd/
 */
export function equals(actual, expected, msg) {
  if (actual !== expected) {
    const error = new AssertError(
      msg ?? `Expected actual to equal expected.`,
      equals
    );
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

export function equalsJSON(actual, expected, msg) {
  const actualJSON = JSON.stringify(actual, null, 2);
  const expectedJSON = JSON.stringify(expected, null, 2);

  if (actualJSON !== expectedJSON) {
    const error = new AssertError(
      msg ?? `Expected equivalent JSON serialization.`,
      equalsJSON
    );
    error.expected = expectedJSON;
    error.actual = actualJSON;
    throw error;
  }
}

export function equalsAst(source, expected, options) {
  const msg = typeof options === 'string' ? options : options?.msg;
  const parserOptions =
    typeof options === 'string' ? undefined : options?.options;
  const ast = astFor(source, parserOptions);
  const padding = ` `.repeat(8);

  if (ast !== `${expected}\n`) {
    let sourceMsg = `${padding}Source: ${source}`;
    if (parserOptions) {
      let formattedOptions = printOptions(parserOptions)
        .split('\n')
        .join(`\n${padding}`);

      sourceMsg += `\n${padding}Options: ${formattedOptions}`;
    }
    const error = new AssertError(
      `\n${sourceMsg}${msg ? `\n${msg}` : ''}\n`,
      equalsAst
    );

    error.expected = expected;
    error.actual = ast;
    throw error;
  }
}

function printOptions(options) {
  if (!options) {
    return '';
  }

  let outOptions = {};

  if (options.srcName) {
    outOptions.srcName = options.srcName;
  }
  if (options.syntax) {
    outOptions.syntax = {};

    if (options.syntax.hash) {
      outOptions.syntax.hash = `{function ${
        options.syntax.hash.name ?? 'anonymous'
      }}`;
    }
    if (options.syntax.square) {
      outOptions.syntax.square = `{function ${
        options.syntax.square.name ?? 'anonymous'
      }}`;
    }
  }

  return JSON.stringify(outOptions, null, 2);
}

/**
 * @todo Use chai's expect-style API instead (`expect(actualValue).to.equal(expectedValue)`)
 * @see https://www.chaijs.com/api/bdd/#method_throw
 */
export function shouldThrow(callback, type, msg) {
  let failed;
  try {
    callback();
    failed = true;
  } catch (caught) {
    if (type && !(caught instanceof type)) {
      const error = new AssertError(
        `An error was thrown, but it had the wrong type. Original error:\n${snippet(
          caught.stack
        )}`,
        shouldThrow
      );
      error.expected = type.name;
      error.actual = caught.constructor.name;
      throw error;
    }

    if (msg) {
      if (typeof msg === 'string') {
        if (msg !== caught.message) {
          const error = new AssertError(
            `Error message didn't match.\n\n${snippet(caught.stack)}` +
              shouldThrow
          );
          error.expected = msg;
          error.actual = caught.message;
          throw error;
        }
      } else if (msg instanceof RegExp) {
        if (!msg.test(caught.message)) {
          const error = new AssertError(
            `Error message didn't match.\n\n${snippet(caught.stack)}` +
              shouldThrow
          );
          error.expected = msg;
          error.actual = caught.message;
          throw error;
        }
      }
    }
  }

  if (failed) {
    throw new AssertError('Expected a thrown exception', shouldThrow);
  }
}
function astFor(template, options = {}) {
  let ast = parse(template, options);
  return print(ast);
}

function snippet(string) {
  return string
    .split('\n')
    .map(function (line) {
      return '      | ' + line;
    })
    .join('\n');
}

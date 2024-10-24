import type { BaseNode } from './types/types.d.ts';

export default class Exception extends Error {
  readonly lineNumber: number | undefined;
  readonly endLineNumber: number | undefined;
  readonly column: number | undefined;
  readonly endColumn: number | undefined;

  readonly description: string | undefined;

  constructor(message: string, node?: BaseNode) {
    const loc = node?.loc;
    let line;
    let endLineNumber;
    let column;
    let endColumn;

    if (loc) {
      line = loc.start.line;
      endLineNumber = loc.end.line;
      column = loc.start.column;
      endColumn = loc.end.column;

      message += ' - ' + line + ':' + column;
    }

    super(message);

    /* istanbul ignore else */
    if (hasCaptureStackTrace(Error)) {
      Error.captureStackTrace(this, Exception);
    }

    try {
      if (loc) {
        this.lineNumber = line;
        this.endLineNumber = endLineNumber;

        // Work around issue under safari where we can't directly set the column value
        /* istanbul ignore next */
        if (Object.defineProperty) {
          Object.defineProperty(this, 'column', {
            value: column,
            enumerable: true,
          });
          Object.defineProperty(this, 'endColumn', {
            value: endColumn,
            enumerable: true,
          });
        } else {
          this.column = column;
          this.endColumn = endColumn;
        }
      }
    } catch (nop) {
      /* Ignore if the browser is very particular */
    }
  }
}

type CapturableError = typeof Error & {
  captureStackTrace: (error: Error, constructor: Function) => void;
};

function hasCaptureStackTrace(error: typeof Error): error is CapturableError {
  return 'captureStackTrace' in error;
}

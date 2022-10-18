export const InputStream = (input: string) => {
  let pos = 0;
  let line = 1;
  let col = 0;

  function next() {
    const ch = input.charAt(pos++);
    if (ch === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
    return ch;
  }

  function peek() {
    return input[pos];
  }

  function debug() {
    return input.slice(pos - 5, pos + 5);
  }

  function peekNext(inc = 1) {
    return input[pos + inc];
  }

  function eof() {
    return !peek();
  }

  function croak(msg: string) {
    throw new Error(msg + " (" + line + ":" + col + ")");
  }

  return { debug, next, peek, peekNext, eof, croak };
};
export type InputStream = ReturnType<typeof InputStream>;

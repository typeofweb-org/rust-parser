import type { InputStream } from "./charInputStream";

type Predicate = (input: string) => boolean;

export const TokenStream = (input: InputStream) => {
  function isWhitespace(ch: string) {
    return /\s/.test(ch);
  }
  function isComma(ch: string) {
    return /,/.test(ch);
  }
  function isValidName(ch: string) {
    return /[a-zA-Z_0-9]/.test(ch);
  }
  function skipWhitespace() {
    return readWhile(isWhitespace);
  }
  function skipComma() {
    return readWhile(isComma);
  }
  function skipWhitespaceOrComma() {
    return readWhile((ch) => isWhitespace(ch) || isComma(ch));
  }
  function readEol() {
    return readWhile((ch) => ch !== "\n");
  }
  function readWhile(predicate: Predicate) {
    let str = "";
    while (!input.eof() && predicate(input.peek())) {
      str += input.next();
    }
    return str;
  }

  function assert(b: unknown, msg: string): asserts b {
    if (!b) {
      input.croak(msg);
    }
  }

  function readString() {
    skipWhitespace();
    assert(input.next() === '"', `input.next() === '"' | ${input.peek()}`);
    let prevEsc = false;
    const str = readWhile((ch) => {
      if (ch === '"') {
        if (prevEsc) {
          return true;
        } else {
          return false;
        }
      }

      if (ch === "\\") {
        prevEsc = true;
      } else {
        prevEsc = false;
      }

      return true;
    });
    assert(input.next() === '"', `input.next() === '"' | ${input.peek()}`);
    return str;
  }

  function readPragmaParam() {
    skipWhitespace();
    const paramName = readWhile(isValidName);
    skipWhitespaceOrComma();
    assert(input.next() === "=", `input.next() === "=" | ${input.peek()}`);
    skipWhitespace();
    const paramValue = readString();
    return { paramName, paramValue };
  }

  function readPragma() {
    skipWhitespace();
    assert(input.next() === "#", `input.next() === "#" | ${input.peek()}`);
    skipWhitespace();
    assert(input.next() === "[", `input.next() === "[" | ${input.peek()}`);
    skipWhitespace();

    // pragma name
    const pragmaName = readWhile(isValidName);
    skipWhitespace();

    // pragma content
    assert(input.next() === "(", `input.next() === "(" | ${input.peek()}`);
    skipWhitespace();
    const pragmaParams: Array<{ paramName: string; paramValue: string }> = [];
    while (input.peek() !== ")") {
      pragmaParams.push(readPragmaParam());
      skipWhitespaceOrComma();
    }

    assert(input.next() === ")", `input.next() === ")" | ${input.peek()}`);
    skipWhitespace();
    assert(input.next() === "]", `input.next() === "]" | ${input.peek()}`);
    skipWhitespace();
    return { pragmaName, pragmaParams };
  }

  function readComments() {
    skipWhitespace();
    let comment = "";
    while (
      input.peek() === "/" &&
      input.next() === "/" &&
      input.next() === "/" &&
      input.next() === "/"
    ) {
      skipWhitespace();
      comment += " " + readWhile((ch) => ch !== "\n").trim();
      skipWhitespace();
    }
    return comment.trim();
  }

  function readStructField() {
    skipWhitespace();
    const fieldComment = readComments();

    skipWhitespace();
    assert(input.next() === "p", `input.next() === "p" | ${input.peek()}`);
    assert(input.next() === "u", `input.next() === "u" | ${input.peek()}`);
    assert(input.next() === "b", `input.next() === "b" | ${input.peek()}`);
    skipWhitespace();

    const fieldName = readWhile(isValidName);
    skipWhitespace();
    assert(input.next() === ":", `input.next() === ":" | ${input.peek()}`);
    skipWhitespace();
    const fieldType = readWhile(isValidName);
    skipWhitespaceOrComma();
    return { fieldName, fieldType, fieldComment };
  }

  function readStruct() {
    skipWhitespace();
    assert(input.next() === "p", `input.next() === "p" | ${input.peek()}`);
    assert(input.next() === "u", `input.next() === "u" | ${input.peek()}`);
    assert(input.next() === "b", `input.next() === "b" | ${input.peek()}`);
    skipWhitespace();
    assert(input.next() === "s", `input.next() === "s" | ${input.peek()}`);
    assert(input.next() === "t", `input.next() === "t" | ${input.peek()}`);
    assert(input.next() === "r", `input.next() === "r" | ${input.peek()}`);
    assert(input.next() === "u", `input.next() === "u" | ${input.peek()}`);
    assert(input.next() === "c", `input.next() === "c" | ${input.peek()}`);
    assert(input.next() === "t", `input.next() === "t" | ${input.peek()}`);
    skipWhitespace();

    // struct name
    const structName = readWhile(isValidName);
    skipWhitespace();
    assert(input.next() === "{", `input.next() === "{" | ${input.peek()}`);
    skipWhitespace();

    // struct fields
    const structFields: Array<{
      fieldName: string;
      fieldType: string;
      fieldComment: string;
    }> = [];

    while (input.peek() !== "}") {
      structFields.push(readStructField());
      skipWhitespaceOrComma();
    }
    skipWhitespaceOrComma();

    // end
    assert(input.next() === "}", `input.next() === "}" | ${input.peek()}`);
    skipWhitespace();

    return { structName, structFields };
  }

  function read() {
    const structsAndPragmas: Array<{
      pragma: {
        pragmaName: string;
        pragmaParams: {
          paramName: string;
          paramValue: string;
        }[];
      };
      struct: {
        structName: string;
        structFields: {
          fieldName: string;
          fieldType: string;
          fieldComment: string;
        }[];
      };
    }> = [];

    while (!input.eof()) {
      skipWhitespace();
      const pragma = readPragma();
      skipWhitespace();
      const struct = readStruct();
      skipWhitespace();
      structsAndPragmas.push({ pragma, struct });
    }

    return structsAndPragmas;
  }

  return { read };
};

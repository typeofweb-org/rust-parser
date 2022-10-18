import { InputStream } from "./charInputStream";
import { TokenStream } from "./tokenStream";
import Fs from "node:fs/promises";

function rustTypeToTypeScript(type: string) {
  return {
    String: "string",
    u64: "number",
    DatabaseConstraint: "/* @todo */ object",
  }[type];
}

async function run() {
  const file = await Fs.readFile(__dirname + "/input.rs", "utf8");
  const inputStream = InputStream(file);
  const tokenStream = TokenStream(inputStream);

  const ast = tokenStream.read();

  const types = ast.map(({ struct, pragma }) => {
    const code = pragma.pragmaParams.find((p) => p.paramName === "code");
    const message = pragma.pragmaParams.find((p) => p.paramName === "message");
    return `
/**
 * ${message?.paramValue}
 */
export interface ${
      struct.structName
    } extends Prisma.PrismaClientKnownRequestError {
  code: "${code?.paramValue}";
  meta: {
    ${struct.structFields
      .map((s) =>
        `
${
  s.fieldComment
    ? `
/**
 * ${s.fieldComment}
 */`
    : ``
}
${s.fieldName}: ${rustTypeToTypeScript(s.fieldType)};
    `.trim()
      )
      .join("\n")}
  };
}
`.trim();
  });

  const union =
    `export type PrismaErrors = ` +
    ast.map(({ struct }) => struct.structName).join(" | ") +
    `;`;

  const enum_ = `export enum PrismaErrorCode {${ast
    .map(({ struct, pragma }) => {
      const code = pragma.pragmaParams.find((p) => p.paramName === "code");
      return `${struct.structName} = "${code?.paramValue}",`;
    })
    .join("\n")}}`;

  await Fs.writeFile(
    __dirname + "/out.ts",
    types.join("\n") + "\n\n" + union + "\n\n" + enum_,
    "utf-8"
  );
}

run();

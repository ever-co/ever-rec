/**
 * Multer keeps an upload in API memory unless the route writes it to disk, and by default it caps
 * neither the file size nor the number of files, text fields or parts. So every file interceptor
 * of the API takes its options from `uploadOptions()`, which caps all of them.
 *
 * This reads the API source, so a new upload route without the caps fails here.
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

const SRC = join(__dirname, '..', '..');

/** The multer interceptors of `@nestjs/platform-express`. */
const MULTER_INTERCEPTORS = new Set([
  'FileInterceptor',
  'FilesInterceptor',
  'FileFieldsInterceptor',
  'AnyFilesInterceptor',
  'NoFilesInterceptor',
]);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });

interface InterceptorCall {
  at: string;
  interceptor: string;
  capped: boolean;
}

const isCallOf = (node: ts.Node, names: Set<string>) =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  names.has(node.expression.text);

const interceptorCalls = (): InterceptorCall[] =>
  sourceFiles(SRC).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    if (!/Interceptor\s*\(/.test(text)) return [];

    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const calls: InterceptorCall[] = [];
    const visit = (node: ts.Node) => {
      if (
        isCallOf(node, MULTER_INTERCEPTORS) &&
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression)
      ) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        calls.push({
          at: `${relative(SRC, file).replace(/\\/g, '/')}:${line + 1}`,
          interceptor: node.expression.text,
          capped: node.arguments.some((argument) =>
            isCallOf(argument, new Set(['uploadOptions'])),
          ),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return calls;
  });

describe('API upload routes', () => {
  const calls = interceptorCalls();

  it('are found by this check', () => {
    expect(calls.map((call) => call.at)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^module\/auth\/auth\.controller\.ts:/),
        expect.stringMatching(
          /^module\/video\/controllers\/chapter\.controller\.ts:/,
        ),
      ]),
    );
  });

  it('all take the capped multer options of uploadOptions()', () => {
    expect(calls.filter((call) => !call.capped)).toEqual([]);
  });
});

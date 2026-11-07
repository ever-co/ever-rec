/**
 * The HTTP route table of the API, read from the controller sources: every `@Controller(...)` with
 * its `@Get/@Post/@Put/@Patch/@Delete/@All(...)` handlers, under the global prefix `api/v1`.
 *
 * Read from the sources rather than from a running `AppModule`, which needs the Firebase project
 * and services the test runs do not have.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const METHODS = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'All',
  'Options',
  'Head',
];

function firstStringArgument(args: string): string {
  const match = /^\s*(?:\{\s*path\s*:\s*)?['"`]([^'"`]*)['"`]/.exec(args);
  return match ? match[1] : '';
}

const join_ = (...parts: string[]) =>
  '/' +
  parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/');

export function routesOfSource(text: string): string[] {
  const routes: string[] = [];
  const controller = /@Controller\(([^)]*)\)/g;
  const marks: Array<{ at: number; base: string }> = [];
  for (const match of text.matchAll(controller)) {
    marks.push({ at: match.index ?? 0, base: firstStringArgument(match[1]) });
  }
  if (!marks.length) return routes;
  const handler = new RegExp(`@(${METHODS.join('|')})\\(([^)]*)\\)`, 'g');
  for (const match of text.matchAll(handler)) {
    const at = match.index ?? 0;
    const owner = [...marks].reverse().find((mark) => mark.at < at);
    if (!owner) continue;
    routes.push(
      `${match[1].toUpperCase()} ${join_('api/v1', owner.base, firstStringArgument(match[2]))}`,
    );
  }
  return routes;
}

/** Every route of the controllers under `srcDir`, sorted, without duplicates. */
export function routeTable(srcDir: string): string[] {
  const routes = new Set<string>();
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        for (const route of routesOfSource(readFileSync(path, 'utf8')))
          routes.add(route);
      }
    }
  };
  visit(srcDir);
  return [...routes].sort();
}

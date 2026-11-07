#!/usr/bin/env node
/**
 * The route list of the portal for the egress audit's browser leg, from the Next.js pages router
 * (`apps/portal/pages`). The harness generates route lists for the app router, Angular and
 * SolidStart; the portal uses the pages router, so this file does the same for it, in the format of
 * the harness's ui-routes.schema.json (framework "manual": the harness walks the list as written).
 *
 *   node tools/egress-audit/ui-routes-pages.mjs [--check]
 *
 * Every page file becomes a route: `index` is the folder itself, `[name]` becomes `:name`,
 * `[...name]` `:name+`, `[[...name]]` `:name*`; `_app`, `_document`, `_error`, files starting with `_`
 * and `api/` are not pages. With --check, exits 1 when a page is missing from
 * tools/egress-audit/ui-routes.json (a page added without updating the list).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const entry = 'apps/portal/pages';
const out = join(here, 'ui-routes.json');

const segment = (name) => {
	let m = /^\[\[\.\.\.(\w+)\]\]$/.exec(name);
	if (m) return `:${m[1]}*`;
	m = /^\[\.\.\.(\w+)\]$/.exec(name);
	if (m) return `:${m[1]}+`;
	m = /^\[(\w+)\]$/.exec(name);
	return m ? `:${m[1]}` : name;
};

export function pageRoutes() {
	const routes = [];
	const walk = (dir, parts) => {
		for (const name of readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) {
				if (parts.length === 0 && name === 'api') continue;
				walk(path, [...parts, segment(name)]);
				continue;
			}
			const m = /^(.+)\.(tsx|ts|jsx|js)$/.exec(name);
			if (!m || m[1].startsWith('_') || /\.(spec|test)$/.test(m[1])) continue;
			const route = m[1] === 'index' ? parts : [...parts, segment(m[1])];
			routes.push({
				path: `/${route.join('/')}`,
				file: relative(root, path).split('\\').join('/'),
				source: 'router'
			});
		}
	};
	walk(join(root, entry), []);
	return routes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

const routes = pageRoutes();
if (process.argv.includes('--check')) {
	const listed = new Set(JSON.parse(readFileSync(out, 'utf8')).routes.map((route) => route.path));
	const missing = routes.filter((route) => !listed.has(route.path));
	for (const route of missing) console.error(`missing from ui-routes.json: ${route.path} (${route.file})`);
	process.exit(missing.length ? 1 : 0);
}
writeFileSync(
	out,
	`${JSON.stringify(
		{
			$schema: '../../node_modules/@ever-co/connect-tools/dist/egress-audit/ui-routes.schema.json',
			framework: 'manual',
			entry,
			routes,
			notes: [
				'Generated from the Next.js pages router by tools/egress-audit/ui-routes-pages.mjs; checked in CI with --check.'
			]
		},
		null,
		2
	)}\n`
);
console.log(`${routes.length} routes`);

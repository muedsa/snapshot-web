import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptTagWithoutCloudflareOptOut = /<script\b(?![^>]*\bdata-cfasync\s*=)/gi;

async function protectScripts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await protectScripts(path);
      return;
    }

    if (!entry.isFile() || extname(entry.name) !== '.html') return;

    const source = await readFile(path, 'utf8');
    const protectedSource = source.replace(
      scriptTagWithoutCloudflareOptOut,
      '<script data-cfasync="false"',
    );

    if (protectedSource !== source) {
      await writeFile(path, protectedSource);
    }
  }));
}

export default function cloudflareScriptCompat() {
  return {
    name: 'cloudflare-script-compat',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        await protectScripts(fileURLToPath(dir));
      },
    },
  };
}

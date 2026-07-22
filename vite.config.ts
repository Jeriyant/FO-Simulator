import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8')) as {
  version: string
}

/** Emit version.json + copy update.sh into dist (same folder as index.html). */
function emitReleaseFiles(appVersion: string): Plugin {
  return {
    name: 'emit-release-files',
    writeBundle(outputOptions) {
      const dir = outputOptions.dir
      if (!dir) return
      mkdirSync(dir, { recursive: true })
      writeFileSync(
        join(dir, 'version.json'),
        `${JSON.stringify({ version: appVersion }, null, 2)}\n`,
        'utf-8',
      )
      const src = join(rootDir, 'update.sh')
      const dest = join(dir, 'update.sh')
      // keep LF endings for Linux servers
      const script = readFileSync(src, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      writeFileSync(dest, script, 'utf-8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so deploy works in root OR subdirectory
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), emitReleaseFiles(version)],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

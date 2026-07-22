import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

/** Emit dist/version.json so update.sh can detect the installed version. */
function emitVersionJson(appVersion: string): Plugin {
  return {
    name: 'emit-version-json',
    writeBundle(outputOptions) {
      const dir = outputOptions.dir
      if (!dir) return
      mkdirSync(dir, { recursive: true })
      writeFileSync(
        `${dir}/version.json`,
        `${JSON.stringify({ version: appVersion }, null, 2)}\n`,
        'utf-8',
      )
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
  plugins: [react(), emitVersionJson(version)],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

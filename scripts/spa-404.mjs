import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const src = join(dist, 'index.html')
const dest = join(dist, '404.html')

if (!existsSync(src)) {
  console.error('dist/index.html not found. Run the build first.')
  process.exit(1)
}

try {
  copyFileSync(src, dest)
  console.log('Created dist/404.html for SPA fallback')
} catch (e) {
  console.error('Failed to create 404.html:', e)
  process.exit(1)
}


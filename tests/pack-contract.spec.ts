/**
 * Pack-contract tests for the Git-installable bundle.
 *
 * dsh.pub and `dsh plugin add github:…` load committed runtime files. These
 * checks keep the published entry list, LICENSE, Host bundle, and Web factory
 * from drifting out of the repository.
 */
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const pkgUrl = new URL('../package.json', import.meta.url)

describe('Git-installable pack contract', () => {
  it('publishes LICENSE, the bundle patch, and both runtime entries', async () => {
    const pkg = JSON.parse(await readFile(pkgUrl, 'utf8')) as {
      main: string
      files: string[]
      exports: Record<string, unknown>
      dsh: { bundle?: { patch?: string } }
      peerDependencies: Record<string, string>
      peerDependenciesMeta: Record<string, { optional?: boolean }>
    }
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.exports['./client']).toBe('./lib/client.js')
    expect(pkg.dsh.bundle?.patch).toBe('./cordis.patch.yml')
    expect(pkg.peerDependencies['dsh-temporary-session']).toBe('^0.1.0-rc.4')
    expect(pkg.peerDependenciesMeta['dsh-temporary-session']?.optional).toBe(true)
    for (const path of [
      'lib/index.js',
      'lib/client.js',
      'lib/client.js.map',
      'cordis.patch.yml',
      'plugin-spec.json',
      'src',
      'tests',
      'README.md',
      'LICENSE',
    ]) {
      expect(pkg.files, path).toContain(path)
    }
  })

  it('keeps the committed Host entry as an ESM apply() module', async () => {
    const source = await readFile(new URL('../lib/index.js', import.meta.url), 'utf8')
    expect(source).toContain('export {')
    expect(source).toMatch(/\bapply\b/)
    expect(source).toMatch(/\binject\b/)
  })

  it('keeps the committed Web entry as a Harness ModuleLoader factory', async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    expect(source).toContain('window.__ModuleLoader__.load')
    expect(source).toContain('"dsh-multi-model-provider"')
    expect(source).toContain('factory:')
  })
})

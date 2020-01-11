/**
 * @migrations-dir __fs__/utils/get-config
 */

import path from 'path'
import { getConfig } from './get-config'

const rootPath = path.resolve()
const migrationsPathAbs = path.resolve('__fs__/utils/get-config')
const migrationsPathRel = path.relative(rootPath, '__fs__/utils/get-config')

describe('utils:getConfig', () => {
  let uri: Parameters<typeof getConfig>[0]

  beforeEach(() => {
    uri = ''
  })

  test(`accepts uri with absolute path: ${`file://${migrationsPathAbs}`}`, () => {
    uri = `file://${migrationsPathAbs}`
    expect(getConfig(uri).sourceConfig.pathname).toBe(migrationsPathAbs)
  })

  test(`accepts uri with relative path: ${`file://./${migrationsPathRel}`}`, () => {
    uri = `file://./${migrationsPathRel}`
    expect(getConfig(uri).sourceConfig.pathname).toBe(migrationsPathAbs)
  })

  test(`accepts ignore_invalid_filename param`, () => {
    uri = `file://${migrationsPathAbs}`
    expect(getConfig(uri).engineConfig.ignoreInvalidFilename).toBe(true)

    uri = `file://${migrationsPathAbs}?ignore_invalid_filename=true`
    expect(getConfig(uri).engineConfig.ignoreInvalidFilename).toBe(true)

    uri = `file://${migrationsPathAbs}?ignore_invalid_filename=false`
    expect(getConfig(uri).engineConfig.ignoreInvalidFilename).toBe(false)
  })

  test('throws if uri is malformed', () => {
    uri = 'file://username@password:hostname/migrations'
    expect(() => getConfig(uri)).toThrow()

    uri = 'file://hostname/migrations'
    expect(() => getConfig(uri)).toThrow()

    uri = 'file:///'
    expect(() => getConfig(uri)).toThrow()
  })

  test(`throws if uri protocol is not 'file:'`, () => {
    uri = 'ftp:///migrations'
    expect(() => getConfig(uri)).toThrow()
  })

  test(`throws if uri has non-existent path`, () => {
    uri = `ftp://${migrationsPathAbs}__`
    expect(() => getConfig(uri)).toThrow()
    uri = `ftp://./${migrationsPathRel}__`
    expect(() => getConfig(uri)).toThrow()
  })

  test(`throws if uri has non-directory path`, () => {
    uri = `file://./tsconfig.json`
    expect(() => getConfig(uri)).toThrow()
  })
})

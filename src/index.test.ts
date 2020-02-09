/**
 * @migrations-dir __fs__/index
 */

import { SynorError } from '@synor/core'
import fs from 'fs'
import path from 'path'
import FSEngine, { FileSourceEngine } from './index'

type MigrationInfoParser = import('@synor/core').MigrationInfoParser

const migrationsPathAbs = path.resolve('__fs__/index')

const migrationFiles: Record<string, string> = {
  '001--do--one.sql': 'SELECT +1;',
  '001--undo--one.sql': 'SELECT -1;',
  '002--do--two.sql': 'SELECT +2;',
  '002--undo--two.sql': 'SELECT -2;',
  '003--do--three.sql': 'SELECT +3;',
  '004--do--four.js': `module.exports = { get body() { return Promise.resolve('SELECT +4;') } }`
}

const firstVersion = '001'
const lastVersion = '004'

const migrationInfoParser: MigrationInfoParser = filename => {
  const [version, type, titleWithExtension] = filename.split('--')
  const [title, extension] = titleWithExtension.split('.')
  return {
    filename,
    version,
    type: type as ReturnType<MigrationInfoParser>['type'],
    title,
    extension
  }
}

beforeAll(() => {
  for (const [filename, body] of Object.entries(migrationFiles)) {
    fs.writeFileSync(path.join(migrationsPathAbs, filename), body)
  }
})

afterAll(() => {
  for (const filename of Object.keys(migrationFiles)) {
    fs.unlinkSync(path.join(migrationsPathAbs, filename))
  }
})

describe('module exports', () => {
  test('default export exists', () => {
    expect(typeof FSEngine).toBe('function')
  })

  test('named export exists', () => {
    expect(typeof FileSourceEngine).toBe('function')
  })

  test('default and named exports are same', () => {
    expect(FSEngine).toBe(FileSourceEngine)
  })
})

describe('initialization', () => {
  let srcUri: Parameters<typeof FileSourceEngine>[0]
  const helpers: Parameters<typeof FileSourceEngine>[1] = {
    migrationInfoParser
  }

  test.each([undefined, null, 0])('throws if uri is %s', uri => {
    expect(() => FileSourceEngine(uri as any, helpers)).toThrow()
  })

  test('throws if uri is empty', () => {
    srcUri = ' '
    expect(() => FileSourceEngine(srcUri, helpers)).toThrow()
  })

  describe('helpers validation', () => {
    beforeEach(() => {
      srcUri = `file://${migrationsPathAbs}`
      helpers.migrationInfoParser = migrationInfoParser
    })

    test(`throws if migrationInfoParser is missing`, () => {
      delete helpers.migrationInfoParser
      expect(() => FileSourceEngine(srcUri, helpers)).toThrow()
    })

    test(`throws if migrationInfoParser is not function`, () => {
      helpers.migrationInfoParser = '' as any
      expect(() => FileSourceEngine(srcUri, helpers)).toThrow()
      helpers.migrationInfoParser = null as any
      expect(() => FileSourceEngine(srcUri, helpers)).toThrow()
    })
  })
})

describe('methods', () => {
  let engine: ReturnType<typeof FileSourceEngine>

  beforeAll(() => {
    engine = FileSourceEngine(`file://${migrationsPathAbs}`, {
      migrationInfoParser
    })
  })

  test('open', async () => {
    await expect(engine.open()).resolves.toBeUndefined()
  })

  test('first', async () => {
    await expect(engine.first()).resolves.toBe(firstVersion)
  })

  test('prev (if exists)', async () => {
    await expect(engine.prev(lastVersion)).resolves.toMatchInlineSnapshot(
      `"003"`
    )
  })

  test('prev (if not exists)', async () => {
    await expect(engine.prev(firstVersion)).resolves.toMatchInlineSnapshot(
      `null`
    )
  })

  test('next (if exists)', async () => {
    await expect(engine.next(firstVersion)).resolves.toMatchInlineSnapshot(
      `"002"`
    )
  })

  test('next (if not exists)', async () => {
    await expect(engine.next(lastVersion)).resolves.toMatchInlineSnapshot(
      `null`
    )
  })

  test('last', async () => {
    await expect(engine.last()).resolves.toBe(lastVersion)
  })

  test('get (if exists)', async () => {
    await expect(engine.get(firstVersion, 'do')).resolves
      .toMatchInlineSnapshot(`
            Object {
              "extension": "sql",
              "filename": "001--do--one.sql",
              "title": "one",
              "type": "do",
              "version": "001",
            }
          `)
  })

  test('get (if not exists: version)', async () => {
    await expect(engine.get('999', 'do')).resolves.toMatchInlineSnapshot(`null`)
  })

  test('get (if not exists: type)', async () => {
    await expect(
      engine.get(lastVersion, 'undo')
    ).resolves.toMatchInlineSnapshot(`null`)
  })

  test('read (if exists)', async () => {
    const info = await engine.get(firstVersion, 'do')
    const content = await engine.read(info!)
    expect(content.toString()).toMatchInlineSnapshot(`"SELECT +1;"`)
  })

  test('#1 read (if exists ; javascript file)', async () => {
    const info = await engine.get(lastVersion, 'do')
    const content = await engine.read(info!)
    expect(content.toString()).toMatchInlineSnapshot(`"SELECT +4;"`)
  })

  test('read (if not exists)', async () => {
    await expect(
      engine.read({ filename: '003--undo--three.sql' } as any)
    ).rejects.toThrowError('ENOENT')
  })

  test('read (unexpect argument)', async () => {
    await expect(engine.read(null as any)).rejects.toThrow()
  })

  test('close', async () => {
    await expect(engine.close()).resolves.toBeUndefined()
  })
})

describe('#2 invalid_filename error handling', () => {
  const patchedMigrationInfoParser: MigrationInfoParser = filename => {
    const info = migrationInfoParser(filename)

    if (info.version === '003') {
      throw new SynorError(
        `Invalid Filename: ${filename}`,
        'invalid_filename',
        { filename }
      )
    }

    return info
  }

  test('ignore_invalid_filename=true', async () => {
    const engine = FileSourceEngine(
      `file://${migrationsPathAbs}?ignore_invalid_filename=true`,
      { migrationInfoParser: patchedMigrationInfoParser }
    )

    await expect(engine.open()).resolves.toBeUndefined()
  })

  test('ignore_invalid_filename=false', async () => {
    const engine = FileSourceEngine(
      `file://${migrationsPathAbs}?ignore_invalid_filename=false`,
      { migrationInfoParser: patchedMigrationInfoParser }
    )

    try {
      await engine.open()
    } catch (error) {
      expect(error).toBeInstanceOf(SynorError)
      expect(error.type).toMatchInlineSnapshot(`"invalid_filename"`)
    }
  })
})

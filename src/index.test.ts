import fs from 'fs'
import path from 'path'
import FSEngine, { FileSourceEngine } from './index'

type MigrationInfoParser = import('@synor/core').MigrationInfoParser

const rootPath = path.resolve()
const migrationsPathAbs = path.resolve('__fs__')
const migrationsPathRel = path.relative(rootPath, '__fs__')

const migrationFiles: Record<string, string> = {
  '001--do--one.sql': 'SELECT +1;',
  '001--undo--one.sql': 'SELECT -1;',
  '002--do--two.sql': 'SELECT +2;',
  '002--undo--two.sql': 'SELECT -2;',
  '003--do--three.sql': 'SELECT +3;'
}

const firstVersion = '001'
const lastVersion = '003'

const migrationInfoParser: MigrationInfoParser = filename => {
  const [version, type, title] = filename.split('--')
  return {
    filename,
    version,
    type: type as ReturnType<MigrationInfoParser>['type'],
    title
  }
}

beforeAll(() => {
  fs.mkdirSync(migrationsPathAbs)
  for (const [filename, body] of Object.entries(migrationFiles)) {
    fs.writeFileSync(path.join(migrationsPathAbs, filename), body)
  }
})

afterAll(() => {
  for (const filename of Object.keys(migrationFiles)) {
    fs.unlinkSync(path.join(migrationsPathAbs, filename))
  }
  fs.rmdirSync(migrationsPathAbs)
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
  let uri: Parameters<typeof FileSourceEngine>[0]
  const helpers: Parameters<typeof FileSourceEngine>[1] = {
    migrationInfoParser
  }

  beforeEach(() => {
    uri = ''
    helpers.migrationInfoParser = migrationInfoParser
  })

  test(`accepts uri with absolute path: ${`file://${migrationsPathAbs}`}`, () => {
    uri = `file://${migrationsPathAbs}`
    expect(() => FileSourceEngine(uri, helpers)).not.toThrow()
  })

  test(`accepts uri with relative path: ${`file://./${migrationsPathRel}`}`, () => {
    uri = `file://./${migrationsPathRel}`
    expect(() => FileSourceEngine(uri, helpers)).not.toThrow()
  })

  test.each([undefined, null, 0])('throws if uri is %s', uri => {
    expect(() => FileSourceEngine(uri as any, helpers)).toThrow()
  })

  test('throws if uri is empty', () => {
    uri = ' '
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'file://username@password:hostname/migrations'
    expect(() => FileSourceEngine(uri, helpers)).toThrow()

    uri = 'file://hostname/migrations'
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
  })

  test(`throws if uri protocol is not 'file:'`, () => {
    uri = 'ftp:///migrations'
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
  })

  test(`throws if uri has non-existent path`, () => {
    uri = `ftp://${migrationsPathAbs}__`
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
    uri = `ftp://./${migrationsPathRel}__`
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
  })

  test(`throws if uri has non-directory path`, () => {
    uri = `file://${migrationsPathAbs}/001--do--one.sql`
    expect(() => FileSourceEngine(uri, helpers)).toThrow()
  })

  describe('helpers validation', () => {
    beforeEach(() => {
      uri = `file://${migrationsPathAbs}`
      helpers.migrationInfoParser = migrationInfoParser
    })

    test(`throws if migrationInfoParser is missing`, () => {
      delete helpers.migrationInfoParser
      expect(() => FileSourceEngine(uri, helpers)).toThrow()
    })

    test(`throws if migrationInfoParser is not function`, () => {
      helpers.migrationInfoParser = '' as any
      expect(() => FileSourceEngine(uri, helpers)).toThrow()
      helpers.migrationInfoParser = null as any
      expect(() => FileSourceEngine(uri, helpers)).toThrow()
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
    await expect(engine.prev(lastVersion)).resolves.toMatchSnapshot()
  })

  test('prev (if not exists)', async () => {
    await expect(engine.prev(firstVersion)).resolves.toMatchSnapshot()
  })

  test('next (if exists)', async () => {
    await expect(engine.next(firstVersion)).resolves.toMatchSnapshot()
  })

  test('next (if not exists)', async () => {
    await expect(engine.next(lastVersion)).resolves.toMatchSnapshot()
  })

  test('last', async () => {
    await expect(engine.last()).resolves.toBe(lastVersion)
  })

  test('get (if exists)', async () => {
    await expect(engine.get(firstVersion, 'do')).resolves.toMatchSnapshot()
  })

  test('get (if not exists: version)', async () => {
    await expect(engine.get('999', 'do')).resolves.toMatchSnapshot()
  })

  test('get (if not exists: type)', async () => {
    await expect(engine.get(lastVersion, 'undo')).resolves.toMatchSnapshot()
  })

  test('read (if exists)', async () => {
    const info = await engine.get(firstVersion, 'do')
    await expect(engine.read(info!)).resolves.toMatchSnapshot()
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

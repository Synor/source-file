import { isSynorError, sortVersions, SynorError } from '@synor/core'
import Debug from 'debug'
import { lstatSync, readdir as fsReadDir, readFile as fsReadFile } from 'fs'
import { join as joinPath } from 'path'
import { promisify } from 'util'
import { getConfig } from './utils/get-config'
import { readJavaScriptMigrationFile } from './utils/read-javascript-migration-file'

type MigrationInfo = import('@synor/core').MigrationInfo
type SourceEngine = import('@synor/core').SourceEngine
type SourceEngineFactory = import('@synor/core').SourceEngineFactory

type Type = MigrationInfo['type']
type Version = MigrationInfo['version']

const debug = Debug('@synor/source-filename')

const readFile = promisify(fsReadFile)
const readDir = promisify(fsReadDir)

export const FileSourceEngine: SourceEngineFactory = (
  uri,
  { migrationInfoParser }
): SourceEngine => {
  const { engineConfig, sourceConfig } = getConfig(uri)

  if (typeof migrationInfoParser !== 'function') {
    throw new SynorError(`Missing: migrationInfoParser`)
  }

  const migrationsByVersion: Record<
    Version,
    Record<Type, MigrationInfo | undefined>
  > = {}

  const sortedVersions: Version[] = []

  const open: SourceEngine['open'] = async () => {
    const filenames = await readDir(sourceConfig.pathname).then(filenames =>
      filenames.filter(filename => {
        const filepath = joinPath(sourceConfig.pathname, filename)
        return lstatSync(filepath).isFile()
      })
    )

    for (const filename of filenames) {
      try {
        const migrationInfo = migrationInfoParser(filename)

        migrationsByVersion[migrationInfo.version] = {
          ...migrationsByVersion[migrationInfo.version],
          [migrationInfo.type]: migrationInfo
        }
      } catch (error) {
        if (
          engineConfig.ignoreInvalidFilename &&
          isSynorError(error, 'invalid_filename')
        ) {
          debug('Ignoring invalid_filename error: %O', error)
        } else {
          throw error
        }
      }
    }

    const versions = sortVersions(Object.keys(migrationsByVersion))

    sortedVersions.push(...versions)
  }

  const close: SourceEngine['close'] = async () => {
    return Promise.resolve()
  }

  const first: SourceEngine['first'] = async () => {
    const version = sortedVersions[0]
    return Promise.resolve(version || null)
  }

  const prev: SourceEngine['prev'] = async version => {
    const index = sortedVersions.indexOf(version)
    const exists = index !== -1
    const first = index === 0

    if (first || !exists) {
      return Promise.resolve(null)
    }

    const prevVersion = sortedVersions[index - 1]

    return Promise.resolve(prevVersion)
  }

  const next: SourceEngine['next'] = async version => {
    const index = sortedVersions.indexOf(version)
    const exists = index !== -1
    const last = index === sortedVersions.length - 1

    if (last || !exists) {
      return Promise.resolve(null)
    }

    const nextVersion = sortedVersions[index + 1]

    return Promise.resolve(nextVersion)
  }

  const last: SourceEngine['last'] = async () => {
    const version = sortedVersions[sortedVersions.length - 1]
    return Promise.resolve(version || null)
  }

  const get: SourceEngine['get'] = async (version, type) => {
    const migrations = migrationsByVersion[version]

    if (!migrations) {
      return Promise.resolve(null)
    }

    const migrationInfo = migrations[type]

    if (!migrationInfo) {
      return Promise.resolve(null)
    }

    return Promise.resolve(migrationInfo)
  }

  const read: SourceEngine['read'] = async ({ filename, extension }) => {
    const migrationFilePath = joinPath(sourceConfig.pathname, filename)

    if (extension === 'js') {
      return readJavaScriptMigrationFile(migrationFilePath)
    }

    const body = await readFile(migrationFilePath, { encoding: 'utf8' })

    return { body }
  }

  return {
    open,
    close,
    first,
    prev,
    next,
    last,
    get,
    read
  }
}

export default FileSourceEngine

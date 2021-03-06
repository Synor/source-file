import { SynorError } from '@synor/core'
import { ConnectionString } from 'connection-string'
import { statSync } from 'fs'
import { resolve } from 'path'

type FileSourceConfig = {
  pathname: string
}

type FileEngineConfig = {
  ignoreInvalidFilename: boolean
}

const validHost = ['', '.']

export function getConfig(
  uri: string
): { engineConfig: FileEngineConfig; sourceConfig: FileSourceConfig } {
  try {
    const {
      protocol,
      hostname: host = '',
      path,
      params
    } = new ConnectionString(uri, {
      params: {
        ignore_invalid_filename: true
      }
    })

    if (!protocol) {
      throw new Error(`[URI] missing: protocol!`)
    }

    if (protocol !== 'file') {
      throw new Error(`[URI] unsupported: protocol(${protocol})!`)
    }

    if (!validHost.includes(host)) {
      throw new Error(`[URI] unsupported: host(${host})!`)
    }

    if (!path) {
      throw new Error(`[URI] missing: path!`)
    }

    const pathname = resolve(`${host}/${path.join('/')}`)

    const stat = statSync(pathname)

    if (!stat.isDirectory()) {
      throw new SynorError(`Directory(${pathname}) does not exist!`)
    }

    const engineConfig: FileEngineConfig = {
      ignoreInvalidFilename: JSON.parse(params!.ignore_invalid_filename)
    }

    const sourceConfig: FileSourceConfig = {
      pathname
    }

    return {
      engineConfig,
      sourceConfig
    }
  } catch (error) {
    throw new SynorError('Invalid SourceURI', 'exception', error)
  }
}

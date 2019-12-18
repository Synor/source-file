import { SynorError } from '@synor/core'
import { statSync } from 'fs'
import { resolve } from 'path'

type FileSourceEngineConfig = {
  pathname: string
}

const validHost = ['', '.']

export function getEngineConfig(uri: string): FileSourceEngineConfig {
  const { protocol, host, pathname: rawPathname } = new URL(uri)

  if (protocol !== 'file:') {
    throw new SynorError(`Invalid SourceURI`)
  }

  if (!validHost.includes(host)) {
    throw new SynorError(`Invalid SourceURI`)
  }

  const pathname = resolve(`${host}${rawPathname}`)

  const stat = statSync(pathname)

  if (!stat.isDirectory()) {
    throw new SynorError(`Invalid SourceURI`)
  }

  return {
    pathname
  }
}

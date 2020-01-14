type MigrationSource = import('@synor/core').MigrationSource
type SourceEngine = import('@synor/core').SourceEngine

export async function readJavaScriptMigrationFile(
  migrationFilePath: string
): ReturnType<SourceEngine['read']> {
  const migrationSource: MigrationSource = await import(migrationFilePath).then(
    m => m.default || m
  )

  const body = await migrationSource.body

  return Buffer.from(body)
}

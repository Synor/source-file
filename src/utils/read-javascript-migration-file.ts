type MigrationSourceContent = import('@synor/core').MigrationSourceContent
type SourceEngine = import('@synor/core').SourceEngine

export async function readJavaScriptMigrationFile(
  migrationFilePath: string
): ReturnType<SourceEngine['read']> {
  const migrationSource: MigrationSourceContent = await import(
    migrationFilePath
  ).then(m => m.default || m)

  if (migrationSource.body) {
    const body = await migrationSource.body

    return { body }
  }

  return migrationSource
}

const { execSync } = require('child_process')
const NodeEnvironment = require('jest-environment-node')
const path = require('path')

class SynorSourceFileTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.docblockPragmas = context.docblockPragmas

    this.migrationsPath = null

    if (this.docblockPragmas['migrations-dir']) {
      if (!/^__fs__\//.test(this.docblockPragmas['migrations-dir'])) {
        throw new Error(
          `@migrations-dir doc block pragma must start with '__fs__/'`
        )
      }

      this.migrationsPath = path.resolve(this.docblockPragmas['migrations-dir'])
    }
  }

  async setup() {
    await super.setup()

    if (this.migrationsPath) {
      execSync(`mkdir -p ${this.migrationsPath}`)
    }
  }

  async teardown() {
    if (this.migrationsPath) {
      execSync(`rm -d ${this.migrationsPath}`)
    }

    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = SynorSourceFileTestEnvironment

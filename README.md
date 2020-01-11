[![Synor Source](https://img.shields.io/badge/synor-source-blue?style=for-the-badge)](https://github.com/Synor)
[![Version](https://img.shields.io/npm/v/@synor/source-file?style=for-the-badge)](https://npmjs.org/package/@synor/source-file)
[![Test](https://img.shields.io/travis/com/Synor/source-file/master?label=Test&style=for-the-badge)](https://travis-ci.com/Synor/source-file)
[![Coverage](https://img.shields.io/codecov/c/gh/Synor/source-file/master?style=for-the-badge)](https://codecov.io/gh/Synor/source-file)
[![License](https://img.shields.io/github/license/Synor/source-file?style=for-the-badge)](https://github.com/Synor/source-file/blob/master/LICENSE)

# Synor Source File

Synor Source Engine - File

## Installation

```sh
# using yarn:
yarn add @synor/source-file

# using npm:
npm install --save @synor/source-file
```

## URI

**Format**: `file://[.]/path[?param=value&...]`

**Params**:

| Name                      | Description                                 | Default Value |
| ------------------------- | ------------------------------------------- | ------------- |
| `ignore_invalid_filename` | Flag for ignoring `invalid_filename` errors | `true`        |

**Examples**:

- `file:///path/to/directory` (Absolute path)
- `file://./path/to/directory` (Relative path)
- `file:///path/to/directory?ignore_invalid_filename=false` (Throws `invalid_filename` error)

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.

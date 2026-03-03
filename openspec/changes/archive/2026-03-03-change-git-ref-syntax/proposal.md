# Change Git Ref Syntax

## Why

当前 `@ref` 语法在通用 Git 源和 GitHub shorthand 之间存在冲突。通用 Git URL（如 `https://github.com/user/repo.git@v1.0.0`）使用 `@ref` 指定 Git ref（分支/tag/commit），但 GitHub shorthand（如 `owner/repo@skill-name`）也使用 `@ref` 指定 skill 名称。这种歧义导致用户无法通过 `@ref` 在通用 Git 源中指定 skill 名称，同时也让解析逻辑变得复杂且容易出错。

## What Changes

- **修改 `parseGenericGitSource` 函数**：将 `@ref` 语法改为仅解析为 skill 名称（在 GitHub shorthand 语境下），不再用于指定 Git ref
- **保留 `#ref` 语法**：通用 Git 源继续使用 `#ref` 指定 Git ref（如 `https://github.com/user/repo.git#v1.0.0`）
- **更新文档和测试**：确保用户了解新的语法规则
- **BREAKING**: 使用 `@ref` 语法的通用 Git URL 需要改为使用 `#ref` 语法

## Capabilities

### New Capabilities

- `git-ref-syntax`: 定义 Git 源的引用语法规则，明确区分 `@ref`（skill 名称）和 `#ref`（Git ref）的使用场景

### Modified Capabilities

- （无现有 spec 需要修改，这是一个解析器行为变更）

## Impact

- **代码影响**: `src/source-parser.ts` 中的 `parseGenericGitSource` 函数需要修改
- **测试影响**: `src/source-parser.test.ts` 和相关测试需要更新
- **文档影响**: README.md 和 AGENTS.md 需要更新语法说明
- **用户影响**: 使用 `@ref` 指定 Git ref 的用户需要改为使用 `#ref`

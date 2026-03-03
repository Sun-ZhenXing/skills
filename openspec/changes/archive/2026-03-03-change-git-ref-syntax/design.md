# Git Ref Syntax Design

## Context

当前 `skills` CLI 支持多种方式来添加技能：

1. **GitHub Shorthand**: `owner/repo` 或 `owner/repo@skill-name`
   - `@skill-name` 用于在仓库中指定特定 skill

2. **Generic Git URLs**: `https://host.com/user/repo.git@v1.0.0` 或 `git@host.com:user/repo.git#branch`
   - `@ref` 或 `#ref` 用于指定 Git ref（分支/tag/commit）

问题在于，`@ref` 在两种语境中有不同含义：

- 在 GitHub shorthand 中，`@` 后面是 skill 名称
- 在 generic git URL 中，`@` 后面是 Git ref

这导致用户无法通过 `@skill-name` 语法在 generic git URL 中指定 skill 名称。

## Goals / Non-Goals

**Goals:**

- 消除 `@ref` 语法在不同语境中的歧义
- 保留 `#ref` 作为 generic git URL 中指定 Git ref 的唯一方式
- 将 `@ref` 专门用于指定 skill 名称（在 GitHub shorthand 和 generic git URL 中一致）
- 保持向后兼容性（对于已经使用 `#ref` 的用户）

**Non-Goals:**

- 不改变 GitHub shorthand 的现有行为
- 不引入新的 URL 格式
- 不改变本地路径的处理方式

## Decisions

### Decision 1: Generic Git URL 中移除 `@ref` 解析

**选择**: 在 `parseGenericGitSource` 函数中，移除对 `@ref` 后缀的解析，只保留 `#ref` 语法。

**理由**:

- 统一语法：所有 Git URL 都使用 `#ref` 指定 Git ref
- 释放 `@ref`：将来可以用于在 generic git URL 中指定 skill 名称
- 简化解析逻辑：减少特殊情况的判断

**替代方案考虑**:

- 保留 `@ref` 作为备选：这会增加复杂性，且没有明显好处
- 智能判断 `@ref` 内容：难以区分 Git ref 和 skill 名称（例如 `main` 可能是分支名也可能是 skill 名）

### Decision 2: 保留 GitHub Shorthand 中的 `@skill-name`

**选择**: `owner/repo@skill-name` 语法保持不变。

**理由**:

- 这是已经广泛使用的语法
- 在 shorthand 语境下，没有 Git ref 的需求（默认使用默认分支）
- 用户可以通过 `owner/repo#ref` 方式指定 ref（如果需要）

### Decision 3: 支持 `owner/repo#ref` 语法

**选择**: 为 GitHub shorthand 添加 `#ref` 支持，使其与 generic git URL 一致。

**理由**:

- 提供一致的用户体验
- 允许用户在 shorthand 中指定 ref 而不使用完整 URL
- 语法与 URL fragment 一致，易于理解

## Risks / Trade-offs

**[Breaking Change]** → 使用 `@ref` 语法的 generic git URL 将失效

- **Mitigation**: 清晰的错误提示，引导用户使用 `#ref` 语法
- **Mitigation**: 在文档和 CHANGELOG 中明确标注此变更

**[User Confusion]** → 用户可能混淆 `@` 和 `#` 的用法

- **Mitigation**: 在帮助文本和文档中提供清晰的示例
- **Mitigation**: 命令行工具可以给出有用的错误提示

## Migration Plan

1. **代码变更**:
   - 修改 `src/source-parser.ts` 中的 `parseGenericGitSource` 函数
   - 移除对 `@ref` 后缀的解析逻辑
   - 保留对 `#ref` 的解析

2. **测试更新**:
   - 更新 `src/source-parser.test.ts` 中相关的测试用例
   - 将 `@ref` 测试用例改为 `#ref`
   - 添加新的测试用例验证 `@ref` 不再被解析为 Git ref

3. **文档更新**:
   - 更新 README.md 中的语法示例
   - 更新 AGENTS.md 中的架构说明

## Open Questions

1. 是否需要保留 `@ref` 解析的废弃警告（deprecation warning），还是直接移除？
   - **建议**: 直接移除，因为这是一个有意为之的破坏性变更

2. 是否需要在 shorthand 中支持 `owner/repo#ref@skill-name` 组合语法？
   - **建议**: 第一阶段不支持，如果需要后续可以添加

## Context

当前仓库来源支持已覆盖任意 Git 仓库，但 URL 输入仍以“仓库地址本体”为主，缺乏统一的 `@ref` 后缀语义（如 `https://github.com/user/skills.git@v1.2.0`）。在团队需要可复现安装时，用户只能依赖默认分支或手工绕过，导致版本漂移、回滚困难和排障成本上升。

现有实现涉及 `source-parser`（输入识别）、`add`（流程调度）、`git`（clone/checkout）、`lock`（来源与版本记录）多个模块，属于跨模块行为一致性问题。

## Goals / Non-Goals

**Goals:**
- 支持在 Git 仓库 URL 后追加 `@<ref>`，并将 `<ref>` 解析为 tag/branch/commit。
- 在安装流程中使用该 `ref` 执行检出，确保安装结果可复现。
- 在锁文件中持久化“原始来源 + 规范化仓库地址 + 解析后的 ref + 最终解析 revision”。
- 保持现有输入（GitHub shorthand、无 `@ref` URL、SSH URL）兼容。

**Non-Goals:**
- 不引入新的 URL 语法（如 query 参数 `?ref=`）。
- 不改变 `skills check/update` 的核心协议，仅补齐本地记录所需字段。
- 不在本变更中实现远端引用存在性预检（仍由 Git checkout 结果决定成功/失败）。

## Decisions

### 1) 采用“末尾 `@` 作为 ref 分隔符”的解析策略
- 规则：仅当输入被判定为 Git 仓库 URL 时，解析最后一个 `@` 之后的片段为 `ref`。
- 原因：兼容 `git@host:org/repo.git` 这类 SSH 语法（前部 `@` 保留为用户信息），同时支持 HTTPS URL 尾部追加引用。
- 备选方案：
  - 使用首个 `@` 分割：会破坏 SSH URL。
  - 使用 `#ref` 或 `?ref=`：与用户需求不一致，且会引入额外兼容矩阵。

### 2) 保持 SourceParser 输出显式化
- 在 source parser 结果中新增/复用显式字段（如 `repoUrl`、`ref`、`resolvedRevision`），避免在后续模块重复字符串解析。
- 原因：减少 `add` 与 `git` 层的解析分歧，便于测试和锁文件写入一致。
- 备选方案：在 `git` 层二次解析输入字符串，复杂度高且易产生边界不一致。

### 3) Git 操作采用“clone 后显式 checkout ref”
- 流程：先 clone 仓库，再在工作目录执行 `git checkout <ref>`（若提供 ref）。
- 原因：对 tag/branch/commit 统一；失败时可直接返回可操作错误。
- 备选方案：`git clone --branch` 仅适用于 branch/tag，不适用于 commit hash，需额外分支处理。

### 4) 锁文件记录“声明引用”与“解析 revision”
- 记录字段区分：
  - 声明引用：用户输入的 `ref`（可能是 tag/branch/hash）
  - 解析 revision：实际安装时的 commit SHA
- 原因：既保留用户意图，又保证后续可追溯与可比较。
- 备选方案：仅记录 SHA；会丢失用户输入语义，不利于可读性与后续更新策略。

## Risks / Trade-offs

- [Risk] `@` 分隔规则在极端 URL 变体下误判 → Mitigation: 增加 parser 单测覆盖 SSH/HTTPS/带端口/本地路径等样例，且仅对远程 Git URL 启用该规则。
- [Risk] 无效 ref 仅在 checkout 阶段失败，报错偏后置 → Mitigation: 统一错误映射为“引用不存在或不可访问”，并保留 Git 原始错误摘要。
- [Trade-off] 复用 clone+checkout 增加一次 Git 命令 → Mitigation: 换取实现统一性与 commit hash 支持，复杂度更低。

## Migration Plan

1. 扩展 `source-parser`：新增 `@ref` 解析与规范化输出。
2. 调整 `add`/`git` 安装流程：在有 ref 时执行 checkout。
3. 更新 lock 写入与读取逻辑：写入 ref 与 resolved revision；旧字段保持向后兼容。
4. 补充测试：解析边界、安装流程、锁文件记录。
5. 更新文档示例：增加 `https://...git@tag` 与 `...@<commit>` 用法。

回滚策略：若上线后出现兼容问题，可回退 parser 对 `@ref` 的启用逻辑，恢复为仅接受原始 URL，不影响既有无 `@ref` 用法。

## Open Questions

- 对于包含 `@` 的极少数非标准 HTTPS 路径是否需要额外转义规则？当前默认按“最后一个 `@`”处理。
- `check/update` 是否需要利用声明 `ref` 执行更细粒度提示（例如固定 commit 时提示不可自动更新）？本次仅保证记录完整，策略可后续迭代。

## Context

`skills add` 当前对远程来源的主路径偏向公开 GitHub 仓库，导致私有 GitHub、GitLab、Gitea、Bitbucket 与自托管 Git 仓库无法以统一方式接入。现有代码已具备本地路径、GitHub shorthand、锁文件与安装器能力，本次设计目标是在不破坏兼容性的前提下扩展“通用 Git 来源”并保持可测试与可运维。

约束：
- 保持已有命令与参数兼容，`skills add vercel-labs/agent-skills` 等现有行为不变。
- 继续依赖本地 `git` 客户端执行拉取/克隆。
- 对私有仓库认证不在 CLI 内新增凭证系统，复用用户现有 Git 凭证链（SSH agent、credential helper、token URL 等）。

## Goals / Non-Goals

**Goals:**
- 支持任意可访问 Git 仓库 URL（HTTPS/SSH）作为 `skills add` 输入。
- 支持可选引用（branch/tag/commit）并在锁文件记录来源与引用。
- 明确错误分类（不可访问、认证失败、结构不合法）并输出可操作提示。
- 保持 GitHub shorthand 与当前 provider 行为兼容。
- 为新增解析路径和安装路径补齐自动化测试。

**Non-Goals:**
- 不新增 Git 凭证托管或交互式登录流程。
- 不重写已有 provider 架构为全新插件系统。
- 不保证对所有 Git 平台提供统一“远端更新检查 API”；非 GitHub 来源可采用保守策略。

## Decisions

1. 扩展来源解析层，增加“通用 Git 仓库来源”类型。
- 方案：在 `source-parser` 中将完整 Git URL（如 `https://host/org/repo.git`、`git@host:org/repo.git`）解析为统一结构，保留可选引用字段。
- 原因：最小化改动，复用已有 add/install 主流程。
- 备选：新增独立命令（如 `skills add-git`）；被拒绝，因增加学习成本且与现有入口重复。

2. 复用现有 `git` 执行层，按来源类型决定 clone/fetch 行为。
- 方案：在 `git.ts` 增补对任意远端 URL 的 clone 支持，并在给定引用时 checkout 指定分支/标签/提交。
- 原因：避免重复实现仓库下载逻辑。
- 备选：直接下载 zip/tarball；被拒绝，因跨平台与认证处理复杂、行为不一致。

3. 锁文件扩展来源元数据但保持向后兼容。
- 方案：记录 `source`（原始输入/标准化 URL）、`sourceType`（github/git/local 等）和 `resolvedRef`（最终检出的引用）。
- 原因：保证后续 update/check 决策可追溯。
- 备选：仅记录规范化 URL；被拒绝，因无法准确还原用户输入与引用解析结果。

4. 更新检查采用平台能力分层策略。
- 方案：GitHub 继续使用现有 hash 检查；非 GitHub 来源默认采用“可检测则检测，不可检测则提示手动更新/重新 add”策略，避免误报。
- 原因：在保证准确性的前提下尽快落地通用 Git 支持。
- 备选：统一对所有 Git 源做深度远端比较；被拒绝，因实现复杂且依赖平台差异。

## Risks / Trade-offs

- [私有仓库认证失败率上升] → 明确提示用户检查 SSH key、credential helper、token 权限，并保留原始 Git 错误摘要。
- [URL 解析歧义（scp-like/带端口/带子路径）] → 增加参数化测试覆盖常见格式，优先采用“能被 git clone 接受”的解析结果。
- [更新检查行为差异导致用户困惑] → 在 `check/update` 输出中标记来源类型并说明非 GitHub 的行为限制。
- [锁文件字段扩展带来兼容风险] → 使用可选字段并保持旧字段读取逻辑不变。

## Migration Plan

- 第一步：合入来源解析与克隆能力扩展，不改变现有 GitHub 路径。
- 第二步：扩展锁文件写入和读取，兼容历史数据。
- 第三步：接入 `check/update` 的来源分层策略与提示文本。
- 第四步：补充单元测试、集成测试与 README 文档示例。
- 回滚策略：若出现严重回归，可回退到仅 GitHub 解析分支，并忽略新增 sourceType 分支逻辑。

## Open Questions

- 非 GitHub 来源在 `check` 命令中是否需要显式“跳过计数”统计输出？
- 对于未指定引用的通用 Git 仓库，锁文件是否记录默认分支名以增强可重复性？
- 是否需要在后续版本增加 `--ref` 显式参数以避免 URL 片段表达差异？
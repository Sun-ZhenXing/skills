## Why

当前 `skills add` 的远程安装流程主要围绕公开 GitHub 仓库设计，限制了企业内网、自建 Git 服务和私有代码托管平台的使用场景。随着团队在 GitLab、Gitea、Bitbucket 及自托管 Git 服务器上沉淀更多技能包，CLI 需要支持“任意可访问 Git 仓库”作为技能来源，降低迁移与接入成本。

## What Changes

- 扩展来源解析与拉取逻辑，允许使用任意 Git 仓库 URL（HTTPS/SSH）安装技能，而不再仅依赖公开 GitHub 仓库模式。
- 统一 `skills add` 的用户体验：保留现有 GitHub shorthand，同时支持完整 Git 地址与分支/标签/提交引用。
- 在校验与错误提示中区分“仓库不可访问”“认证失败”“仓库结构不合法”等场景，减少排障成本。
- 调整更新检查策略：对非 GitHub 来源采用可行且明确的更新行为（例如基于已记录引用或提示手动更新），避免误报。
- 补充文档与测试覆盖，确保跨平台路径和不同 Git 源输入格式都可用。

## Capabilities

### New Capabilities
- `any-git-repository-source`: 支持从任意可访问的 Git 代码仓库发现并安装 skill，并在锁文件中记录来源与引用信息。

### Modified Capabilities
- *(none)*

## Impact

- 受影响代码：`src/source-parser.ts`、`src/add.ts`、`src/git.ts`、`src/skill-lock.ts`、相关 provider/安装流程与测试文件。
- CLI 输入兼容性：现有 GitHub shorthand 与当前安装方式保持兼容。
- 依赖与环境：继续依赖本地 `git` 可执行文件；对私有仓库认证依赖用户已有 Git 凭证配置。
- 文档：`README.md` 的来源格式与使用示例需更新。
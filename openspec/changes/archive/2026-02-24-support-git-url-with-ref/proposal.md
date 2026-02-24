## Why

当前 `skills add` 已支持 Git 仓库来源，但当用户希望固定到特定版本时，`https://github.com/user/skills.git@tag` 这类输入尚未被稳定识别与处理。缺少统一的 `@ref` 语法支持会导致版本不可复现，影响团队协作与回滚。

## What Changes

- 扩展仓库来源解析逻辑，支持在 Git URL 后追加 `@<ref>`，其中 `<ref>` 可为 tag、branch 或 commit hash。
- 为 `skills add` 引入明确且一致的引用解析规则，避免与 URL 中的端口、用户名或路径符号冲突。
- 调整 Git 拉取/检出流程，优先使用解析出的 `ref` 执行检出，确保安装结果可复现。
- 在锁文件记录中保留原始来源与解析后的 `ref` 信息，便于后续 `check/update` 与问题排查。
- 补充解析与集成测试，覆盖常见 URL 变体与错误输入场景。

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `any-git-repository-source`: 增加“Git URL 支持 `@ref` 后缀并按该引用安装”的规范要求。

## Impact

- 受影响代码：`src/source-parser.ts`、`src/add.ts`、`src/git.ts`、`src/types.ts` 与相关测试文件。
- 兼容性：不破坏现有 GitHub shorthand 与无 `@ref` 的仓库 URL 输入。
- 用户体验：安装命令可显式固定版本，减少“最新分支漂移”带来的非确定性。

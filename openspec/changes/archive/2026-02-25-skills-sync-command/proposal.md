## Why

当前 CLI 提供了 `experimental_install` 命令用于从 `skills-lock.json` 恢复技能，但这个命令的功能较为基础，只能重新安装缺失的技能，无法处理技能更新、哈希校验或删除等场景。用户在团队协作时需要一个可靠的同步机制，确保所有成员的技能环境一致，避免"在我机器上能运行"的问题。

## What Changes

- 新增 `skills sync` 命令，用于从 lock 文件同步技能内容
- 根据 `skills-lock.json` 中记录的哈希值校验本地技能内容
- 支持检测技能更新、缺失、和本地修改
- 提供 `--dry-run` 模式预览同步操作
- 支持 `--force` 强制重新同步所有技能
- 支持选择性同步指定技能
- 同步完成后更新 lock 文件记录

## Capabilities

### New Capabilities
- `lock-file-sync`: 从 lock 文件同步技能内容的核心功能，包括哈希校验、差异检测和智能同步

### Modified Capabilities
- （无现有 spec 需要修改）

## Impact

- 新增 `src/sync-lock.ts` 模块实现核心同步逻辑
- 修改 `src/cli.ts` 添加 `sync` 命令及其参数解析
- 可能复用 `src/install.ts` 中的部分安装逻辑
- 依赖 `@clack/prompts` 用于交互式确认
- 影响 `.agents/skills/` 目录和 `skills-lock.json` 文件

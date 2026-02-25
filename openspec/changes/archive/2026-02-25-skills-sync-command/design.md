## Context

当前 CLI 有两个相关但功能不同的命令：
- `experimental_install`: 从 `skills-lock.json` 恢复技能，但仅支持重新安装缺失技能
- `experimental_sync`: 从 `node_modules` 扫描并同步技能

用户在团队协作场景下需要一个更完整的同步机制，能够：
1. 验证本地技能内容与 lock 文件记录的一致性
2. 检测并处理技能更新
3. 支持预览模式（dry-run）
4. 提供灵活的同步策略（强制、选择性等）

现有的 `local-lock.ts` 提供了读取和写入 lock 文件的 API，`installer.ts` 提供了技能安装的核心逻辑。

## Goals / Non-Goals

**Goals:**
- 实现 `skills sync` 命令从 lock 文件同步技能
- 支持哈希校验检测本地技能是否被修改
- 提供 `--dry-run` 模式预览同步变更
- 支持 `--force` 强制重新同步
- 支持指定技能名称进行选择性同步
- 保持与现有 `experimental_install` 命令的向后兼容

**Non-Goals:**
- 不修改 lock 文件格式（继续使用现有的 v1 格式）
- 不替代 `experimental_sync`（node_modules 同步功能保留）
- 不实现自动合并冲突解决（交互式确认）
- 不支持跨项目技能共享

## Decisions

### 1. 命令命名采用 `skills sync`（而非 `skills install`）
- **选择**: 使用 `sync` 而非修改现有的 `install` 命令
- **理由**: `sync` 更能表达"使本地状态与 lock 文件一致"的语义，区别于 `add`（新增）和 `install`（首次安装）
- **替代方案**: 增强 `experimental_install`，但会造成语义混淆

### 2. 复用现有安装逻辑而非重写
- **选择**: 复用 `installer.ts` 中的 `installSkillForAgent` 函数
- **理由**: 保持安装逻辑一致性，避免代码重复
- **注意点**: 需要修改安装流程以支持"强制重新安装"模式

### 3. 哈希校验策略
- **选择**: 使用 `local-lock.ts` 中现有的 `computeSkillFolderHash` 进行校验
- **理由**: 与 lock 文件生成时使用的算法保持一致
- **行为**: 哈希不匹配时视为"需要同步"，不尝试自动合并

### 4. 交互式确认流程
- **选择**: 对任何会修改本地文件的操作都进行确认（除非使用 `--yes`）
- **理由**: 避免意外覆盖用户的本地修改
- **实现**: 使用 `@clack/prompts` 的 `confirm` 和 `multiselect`

### 5. 同步状态分类
- **选择**: 将技能状态分为以下几类：
  - `missing`: lock 中有记录但本地不存在
  - `modified`: 本地存在但哈希值与 lock 不匹配
  - `up-to-date`: 本地存在且哈希值匹配
  - `orphaned`: 本地存在但 lock 中没有记录

## Risks / Trade-offs

- **哈希计算性能** → 技能文件夹较大时可能影响同步速度。Mitigation: 添加进度指示器和 `--yes` 跳过确认
- **并发安装冲突** → 多技能同时安装时可能产生冲突。Mitigation: 串行安装，一个失败不阻断其他
- **向后兼容** → 修改 `installer.ts` 接口可能影响其他命令。Mitigation: 使用可选参数，保持默认行为不变

## Migration Plan

1. **Phase 1**: 实现 `skills sync` 命令作为新功能
2. **Phase 2**: 内部测试验证与 `experimental_install` 的功能等价性
3. **Phase 3**: 文档更新，将 `skills sync` 标记为推荐命令
4. **Phase 4**: 后续版本考虑废弃 `experimental_install`

## Open Questions

- 是否需要支持 `--prune` 参数删除 lock 中不存在的本地技能？
- 是否需要记录同步历史日志？

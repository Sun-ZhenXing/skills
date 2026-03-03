## Why

`ParsedSource` 接口相比上游 `main` 分支新增了三个 ref 相关字段（`declaredRef`、`resolvedRef`、`resolvedRevision`），其中 `resolvedRevision` 是完全死代码（从未被赋值或读取），另外两个与已有的 `ref` 字段在 parse 阶段始终保持相同的值，造成冗余维护负担。

## What Changes

- **BREAKING (internal)** 从 `ParsedSource` 接口中删除 `resolvedRevision` 字段（从未在解析阶段赋值或读取，只属于 `SkillLockEntry`）
- **BREAKING (internal)** 从 `ParsedSource` 接口中删除 `declaredRef` 和 `resolvedRef` 字段（在解析阶段始终与 `ref` 相同，冗余）
- 更新 `src/source-parser.ts`：解析函数只设置 `ref`，移除重复的 `declaredRef` / `resolvedRef` 赋值
- 更新 `src/add.ts`：写入 lock 文件时直接使用 `parsed.ref`，删除 `parsed.declaredRef ?? parsed.ref` fallback 逻辑
- 更新相关测试：删除对 `declaredRef` / `resolvedRef` 的断言，仅保留对 `ref` 的验证

## Capabilities

### New Capabilities

<!-- 无新功能，此变更为纯内部重构 -->

### Modified Capabilities

<!-- 行为无变化，仅内部接口清理，无需 spec 层面修改 -->

## Impact

- `src/types.ts`：删除 `ParsedSource.declaredRef`、`ParsedSource.resolvedRef`、`ParsedSource.resolvedRevision`
- `src/source-parser.ts`：移除所有 `declaredRef` / `resolvedRef` 赋值
- `src/add.ts`：简化 lock 写入逻辑，使用 `parsed.ref` 代替 fallback 表达式
- `src/source-parser.test.ts`：更新测试断言
- `tests/source-parser.test.ts`：更新测试断言
- `tests/install-git-shorthand.test.ts`：更新引用
- `SkillLockEntry`（`src/skill-lock.ts`）中的 `declaredRef` / `resolvedRef` / `resolvedRevision` 字段**保持不变**

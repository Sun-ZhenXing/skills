## Context

`ParsedSource`（`src/types.ts`）是 `parseSource()` 的返回类型，表示解析后的 source 字符串。与上游 `main` 分支相比，本 fork 新增了三个字段：

- `declaredRef?: string` — 用于记录用户输入的显式 ref（如 `#v1.0.0`）
- `resolvedRef?: string` — 解析后使用的 ref
- `resolvedRevision?: string` — checkout 后的 git commit SHA

经代码审查发现：
1. `resolvedRevision` 在 `ParsedSource` 中从未被赋值或读取（完全死代码），仅在 `SkillLockEntry` 中有意义
2. `declaredRef` 和 `resolvedRef` 在 parse 阶段始终和 `ref` 被设置为相同的值，`add.ts` 中的 fallback 写法 `parsed.declaredRef ?? parsed.ref` 说明两者总是等价的

## Goals / Non-Goals

**Goals:**
- 从 `ParsedSource` 中删除 `resolvedRevision`（死代码）
- 从 `ParsedSource` 中删除 `declaredRef` 和 `resolvedRef`（与 `ref` 完全冗余）
- 使 `ParsedSource` 回归到与上游 `main` 相同的结构（只保留 `ref`）
- 简化 `add.ts` 中写入 lock 文件时的冗余 fallback 逻辑

**Non-Goals:**
- 不修改 `SkillLockEntry`，该接口的三个 ref 字段（`declaredRef`、`resolvedRef`、`resolvedRevision`）在 install 阶段有真实的语义区别，保持不变
- 不改变任何用户可见行为（`#ref` 语法依然正常工作）
- 不修改 lock 文件格式（v3）

## Decisions

### 决策 1：从 `ParsedSource` 完全删除三个冗余字段

**选择**：直接删除，不用别名或迁移路径。

**理由**：这是内部类型，没有外部 API 消费者。在解析阶段只需要 `ref` 传给 `cloneRepo()`；lock entry 的详细字段由 `SkillLockEntry` 独立维护。

**替代方案**：保留 `declaredRef`/`resolvedRef` 作为 `ref` 的别名 — 被否决，引入更多歧义而非减少。

### 决策 2：`add.ts` 写 lock 时直接使用 `parsed.ref`

将：
```typescript
declaredRef: parsed.declaredRef ?? parsed.ref,
resolvedRef: parsed.resolvedRef ?? parsed.ref,
```
简化为：
```typescript
declaredRef: parsed.ref,
resolvedRef: parsed.ref,
```

**理由**：fallback 的两个分支结果相同，直接用 `parsed.ref` 即可。

### 决策 3：测试断言只保留对 `ref` 的验证

删除 `src/source-parser.test.ts` 和 `tests/source-parser.test.ts` 中所有对 `declaredRef`/`resolvedRef` 的断言。

**理由**：行为测试应关注 `ref`（`cloneRepo` 使用的值），而非内部冗余字段。

## Risks / Trade-offs

- [风险] 未来若需要区分 `declaredRef` 和 `resolvedRef` 在 parse 阶段的语义 → 届时可重新添加，修改代价低
- [Trade-off] `SkillLockEntry` 仍保留三个字段，与简化后的 `ParsedSource` 不完全对称，但两者职责不同（parse 阶段 vs install 阶段），这种不对称是合理的

## Open Questions

无。

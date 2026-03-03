# Implementation Tasks

## 1. Clean Up `ParsedSource` Interface

- [x] 1.1 从 `src/types.ts` 的 `ParsedSource` 接口中删除 `declaredRef?: string` 字段
- [x] 1.2 从 `src/types.ts` 的 `ParsedSource` 接口中删除 `resolvedRef?: string` 字段
- [x] 1.3 从 `src/types.ts` 的 `ParsedSource` 接口中删除 `resolvedRevision?: string` 字段

## 2. Update Source Parser

- [x] 2.1 从 `src/source-parser.ts` 中所有解析函数的返回值移除 `declaredRef` 赋值
- [x] 2.2 从 `src/source-parser.ts` 中所有解析函数的返回值移除 `resolvedRef` 赋值（仅保留 `ref`）

## 3. Simplify `add.ts` Lock Write Logic

- [x] 3.1 将 `add.ts` 中 `declaredRef: parsed.declaredRef ?? parsed.ref` 替换为 `declaredRef: parsed.ref`（两处）
- [x] 3.2 将 `add.ts` 中 `resolvedRef: parsed.resolvedRef ?? parsed.ref` 替换为 `resolvedRef: parsed.ref`（两处）

## 4. Update Tests

- [x] 4.1 从 `src/source-parser.test.ts` 中删除所有对 `declaredRef` 和 `resolvedRef` 的断言，只保留对 `ref` 的验证
- [x] 4.2 从 `tests/source-parser.test.ts` 中删除所有对 `declaredRef` 和 `resolvedRef` 的断言，只保留对 `ref` 的验证
- [x] 4.3 检查 `tests/install-git-shorthand.test.ts` 是否有对 `declaredRef`/`resolvedRef` 的引用，如有则更新

## 5. Verification

- [x] 5.1 运行 `pnpm type-check` 确认无类型错误
- [x] 5.2 运行 `pnpm test --run` 确认全部测试通过

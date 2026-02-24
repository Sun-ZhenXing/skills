## 1. Source 解析扩展

- [x] 1.1 在 `src/source-parser.ts` 中为远程 Git URL 增加可选 `@<ref>` 后缀解析，使用“最后一个 `@`”规则避免破坏 SSH 用户段
- [x] 1.2 更新 `src/types.ts`（或相关类型定义）以表达解析后的仓库地址与可选 `ref` 字段
- [x] 1.3 在 `src/source-parser.test.ts` 增加 `https://...git@tag`、`...@branch`、`...@<commit>`、`git@host:org/repo.git@main` 覆盖

## 2. 安装与 Git 流程对齐

- [x] 2.1 在 `src/add.ts` 透传解析后的 `ref` 到 Git 安装流程，保持无 `ref` 路径行为不变
- [x] 2.2 在 `src/git.ts` 实现“clone 后 checkout ref（若提供）”并补充失败场景错误信息
- [x] 2.3 为安装流程增加测试，验证指定 `ref` 时实际按目标引用安装

## 3. 锁文件与兼容性

- [x] 3.1 在锁文件写入路径（`src/skill-lock.ts`/`src/local-lock.ts` 相关逻辑）记录声明 `ref` 与解析 revision
- [x] 3.2 保持旧锁文件字段缺失时的读取兼容，避免回归
- [x] 3.3 增加锁文件测试，校验有/无 `ref` 两种输入下的记录结果

## 4. 文档与验证

- [x] 4.1 更新 `README.md` 的 `skills add` 示例，增加 `https://github.com/user/skills.git@tag` 用法说明
- [x] 4.2 运行针对性测试（source parser、git/add、lock）并修复本变更相关问题
- [x] 4.3 运行全量测试与格式化检查，确认无新增回归

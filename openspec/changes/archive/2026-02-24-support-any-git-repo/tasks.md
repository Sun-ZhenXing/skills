## 1. Source Parsing & Input Classification

- [x] 1.1 扩展 `src/source-parser.ts`，新增对任意 Git URL（HTTPS/SSH/scp-like）的识别与标准化解析
- [x] 1.2 保持 GitHub shorthand 解析分支不变，并补充分支优先级用例防止回归
- [x] 1.3 为 Git 来源解析增加可选引用（branch/tag/commit）提取与结构化字段
- [x] 1.4 在 `tests/source-parser.test.ts`（及相关测试）中补充任意 Git URL 与边界格式覆盖

## 2. Clone/Install Flow for Generic Git Repositories

- [x] 2.1 在 `src/git.ts` 增补通用远端 clone + 可选 checkout 引用能力并统一错误映射
- [x] 2.2 在 `src/add.ts`/`src/installer.ts` 接入新来源类型，复用现有 skill discovery/install 流程
- [x] 2.3 为认证失败、仓库不可达、结构不合法三类场景输出可操作错误提示
- [x] 2.4 增加针对私有仓库失败与成功路径的单元/集成测试（使用 mock Git 命令结果）

## 3. Lock File Metadata & Compatibility

- [x] 3.1 扩展锁文件类型定义（`src/types.ts`、`src/skill-lock.ts`、`src/local-lock.ts`）记录 `sourceType`、`source`、`resolvedRef`
- [x] 3.2 写入锁文件时为 Git 来源持久化新增元数据，读取时保持旧版本字段兼容
- [x] 3.3 补充 `tests/local-lock.test.ts` 与相关兼容测试，验证缺失新字段时仍可正常读取

## 4. Check/Update Behavior for Non-GitHub Sources

- [x] 4.1 在 `src/cli.ts` 的 `check/update` 路径中按 `sourceType` 分支处理 GitHub 与非 GitHub 来源
- [x] 4.2 为无法自动 freshness 检测的非 GitHub 来源输出明确“需手动更新”状态而非误报
- [x] 4.3 为 `check/update` 新行为补充测试，覆盖 GitHub 现有流程不变与非 GitHub 新提示

## 5. Documentation, Validation & Regression Safety

- [x] 5.1 更新 `README.md` 的 `skills add` 示例，新增任意 Git 仓库（HTTPS/SSH）使用说明
- [x] 5.2 运行针对性测试：`pnpm test tests/source-parser.test.ts tests/local-lock.test.ts tests/dist.test.ts`
- [x] 5.3 运行完整质量校验：`pnpm test`、`pnpm type-check`、`pnpm format` 并修复本变更引入问题
# 七、常见坑位清单

| 问题 | 原因 | 解决 |
| --- | --- | --- |
| Excel 动作里表下拉框为空 / 找不到表 | 文件里没有真正的"表格(Table)" | 选中区域 → 插入 → 表格，并命名为 `TB_Log` |
| 写入极慢或超时 | 逐行 `Add a row into a table` | 改用 Office Scripts 批量写入（[`scripts/appendRowsToTable.ts`](scripts/appendRowsToTable.ts)） |
| 数据重复 | 每次运行都追加 | 加去重判断、按 Key 更新，或先删后写（[`scripts/deleteRowsByDate.ts`](scripts/deleteRowsByDate.ts)） |
| 取到的是旧数据 | 语义模型刷新尚未完成 | 用 `When a dataset refresh completes` 触发，或轮询 `Get refresh history` |
| 时间差 8 小时 | 直接用了 `utcNow()` | `convertFromUtc(utcNow(),'China Standard Time','yyyy-MM-dd HH:mm:ss')` |
| 查询报行数/值数超限 | DAX 拉了明细表 | 在 DAX 中先聚合，或按日期分批循环取数 |
| 中文列名报错 / 取到 null | 未加方括号转义 | `item()?['[列名]']`，或改用 `Parse JSON` 后用友好名 |
| 文件被锁定 / 409 冲突 | 多个流并发写同一文件 | 并发度设为 1，或按业务/月份拆分文件 |
| 数字变成文本（左对齐） | 未做类型转换或列格式为文本 | 流里用 `float()` / `int()`，Excel 里把列设为数值格式 |
| 401 / 403 | 账号无语义模型 Build 权限 | 在语义模型"管理权限"中授予 Build |
| 度量值为空导致转换失败 | `float(null)` 报错 | `float(coalesce(item()?['[销售额]'], 0))` |
| 流突然全部失败 | 连接失效（改密 / 离职 / MFA 策略） | 改用服务账号，添加共同所有者，见 [`06-testing-and-golive.md`](06-testing-and-golive.md#4-权限交接) |
| 文件越来越慢 | 单表行数过大 | 单表控制在 5 万行内，按月归档分文件 |
| `Do until` 一直循环 | 未设上限 | 在"限制"中设置 Count 与 Timeout |
| Parse JSON 校验失败 | 某字段可能为 null | 在 Schema 中把类型改为 `["number","null"]` |

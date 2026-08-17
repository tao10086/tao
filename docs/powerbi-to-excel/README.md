# 用 Power Automate 读取 Power BI 数据并自动写入 Excel

本目录提供一整套可落地的方案资产：从前置准备、Excel 目标文件设计、Cloud Flow 结构，
到可直接复用的 DAX 查询、Office Scripts 批量写入脚本和流定义示例。

## 目录结构

| 路径 | 说明 |
| --- | --- |
| [`01-prerequisites.md`](01-prerequisites.md) | 账号许可、存储位置、路线选择（A/B/C） |
| [`02-excel-target.md`](02-excel-target.md) | Excel 目标文件与 `TB_Log` 表结构准备 |
| [`03-flow-route-a.md`](03-flow-route-a.md) | 路线 A：DAX 查询语义模型 → 写入 Excel（推荐，逐动作配置） |
| [`04-route-b-export.md`](04-route-b-export.md) | 路线 B：导出报表/视觉对象数据 |
| [`05-route-c-direct-source.md`](05-route-c-direct-source.md) | 路线 C：绕过 Power BI 直连数据源 |
| [`06-testing-and-golive.md`](06-testing-and-golive.md) | 测试、上线、权限交接与监控 |
| [`07-troubleshooting.md`](07-troubleshooting.md) | 常见坑位清单 |
| [`dax/`](dax) | 可复用 DAX 模板（汇总型、增量型、测试用小样） |
| [`scripts/`](scripts) | Office Scripts 批量写入 / 清理脚本 |
| [`flows/`](flows) | 示例 Cloud Flow 定义 JSON（可导入参考） |
| [`excel/`](excel) | Excel 表头模板与列格式说明 |

## 30 秒速览

1. 在 OneDrive for Business / SharePoint 建 `PowerBI_Log.xlsx`，插入名为 `TB_Log` 的表格。
2. 在 Power BI Desktop / DAX Studio 里写好并验证聚合型 `EVALUATE` 查询。
3. 建 Cloud Flow：`Recurrence` 或 `When a dataset refresh completes` 触发 →
   `Run a query against a dataset` → `Parse JSON` → 写入 Excel。
4. 行数少用 `Add a row into a table`；行数多用 Office Scripts `Run script` 一次性批量写入。
5. 加去重（先查后写 / 按 Key 更新）、加 `Try / Catch / Finally` 与失败通知。
6. 先用 `TOPN(10, ...)` 小样跑通，再放开全量。

## 路线选择速查

```
数据在语义模型里，需要灵活取数/聚合  ──► 路线 A（推荐）
必须与报表页面显示完全一致            ──► 路线 B（需 Premium/PPU 容量）
数据源本身可直连（SQL/Dataverse 等）  ──► 路线 C（最稳、成本最低）
```

各路线的取舍详见 [`01-prerequisites.md`](01-prerequisites.md)。

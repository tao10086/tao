# 五、路线 C：绕过 Power BI 直连数据源

如果 Power BI 里的数据本来就来自 SQL Server / Azure SQL / Dataverse / SharePoint 列表
等可直连的数据源，最稳、最省钱的做法是直接取源数据。

## 1. 流程结构

1. **触发器**：`Recurrence`（时区 China Standard Time）。
2. **取数**：按数据源选连接器
   - SQL Server → `Execute a SQL query (V2)` 或 `Get rows (V2)`（本地库需数据网关）
   - Dataverse → `List rows`（可用 FetchXML 做聚合）
   - SharePoint → `Get items`（配合 `Filter Query` 减少行数）
3. **整形**：`Select` 动作把结果映射为与 `TB_Log` 表头一致的对象数组，
   数值用 `float()` / `int()` 转换。
4. **写入**：与路线 A 完全相同 —— 行数少用 `Add a row into a table`，
   行数多用 Office Scripts [`scripts/appendRowsToTable.ts`](scripts/appendRowsToTable.ts)。
5. **去重 / 错误处理 / 归档**：复用 [`03-flow-route-a.md`](03-flow-route-a.md) 的第 8–10 节。

## 2. 优点

- 无 `Run a query against a dataset` 的 10 万行 / 1000 万值上限。
- 不依赖 Premium，也不依赖语义模型刷新是否完成。
- 通常更快、更稳定，失败点更少。

## 3. 缺点与应对

| 缺点 | 应对 |
| --- | --- |
| 需要自行复刻 Power BI 中的度量值逻辑 | 把 DAX 度量值逐条翻译成 SQL，并与报表对数验证 |
| 口径可能与报表不一致 | 上线前跑一次对账：同一天的数值与报表逐项比对，差异为 0 才上线 |
| 直连生产库有性能影响 | 在只读副本/数据仓库上查询，并加时间范围过滤 |
| 本地数据源需要网关 | 部署本地数据网关，并确认网关账号权限与高可用 |

## 4. 何时选它

- 需要的字段本来就在源表里，度量值逻辑简单（求和、计数）。
- 行数较大（数万行以上），会撞上语义模型查询上限。
- 没有 Premium/PPU 许可，或不希望依赖 Power BI 刷新时序。

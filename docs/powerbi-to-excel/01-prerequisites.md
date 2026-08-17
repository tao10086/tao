# 一、前置准备

## 1. 账号与许可

| 项目 | 要求 |
| --- | --- |
| Power BI | Power BI Pro（或 PPU / Premium 容量）账号，且对目标语义模型（Dataset）有 **Build** 权限 |
| Power Automate | 标准连接器即可满足路线 A：**Power BI**、**Excel Online (Business)** |
| Premium 许可 | 仅当需要 `HTTP with Azure AD`、直接调用 Power BI REST API、或 `Export To File` 时才需要 |

> 没有 Build 权限时，`Run a query against a dataset` 会返回 401/403。请先在语义模型的
> "管理权限"里授予 Build。

## 2. 存储位置

- 目标 Excel 文件必须放在 **OneDrive for Business** 或 **SharePoint 文档库**中。
- 本地磁盘上的文件无法被云端流访问（除非部署本地数据网关 + Desktop Flow，成本高，不推荐）。
- 建议为该文件单独建一个文件夹，便于后续做归档流。

## 3. 确认数据来源形态（决定走哪条路线）

### 路线 A：语义模型（Dataset）→ DAX 查询取数 —— **推荐**

- 最灵活：可任意聚合、切片、复用报表中的度量值。
- 口径与报表一致（同一套度量值）。
- 限制：`Run a query against a dataset` 单次返回 **最多约 10 万行 / 1000 万个值**，
  且有约 **10 分钟**超时。
- 详见 [`03-flow-route-a.md`](03-flow-route-a.md)。

### 路线 B：报表视觉对象数据 → 导出后解析

- 适用于"必须与报表页面显示完全一致（含视觉级筛选器）"的场景。
- 需要 Premium / Fabric 容量或 PPU，并有每日导出配额限制。
- 详见 [`04-route-b-export.md`](04-route-b-export.md)。

### 路线 C：绕过 Power BI，直连底层数据源

- 数据本来就来自 SQL Server / Dataverse / SharePoint 列表等时最稳、最省钱。
- 缺点：需要在流里自行复刻度量值逻辑，口径可能与报表不一致。
- 详见 [`05-route-c-direct-source.md`](05-route-c-direct-source.md)。

## 4. 决策清单

在开工前请逐项确认：

- [ ] 已确认目标语义模型所在的工作区名称与 Dataset 名称。
- [ ] 已确认账号对该语义模型有 Build 权限。
- [ ] 已确认目标 Excel 文件的存放位置（OneDrive / SharePoint 站点 + 文档库路径）。
- [ ] 已确认记录频率（每天 / 每小时 / 刷新完成后触发）与时区（China Standard Time）。
- [ ] 已估算单次写入行数（决定用 `Add a row` 还是 Office Scripts）。
- [ ] 已确认是"追加历史记录"还是"覆盖当日快照"（决定去重策略）。
- [ ] 已确认流的运行身份（强烈建议使用服务账号而非个人账号）。

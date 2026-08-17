# 四、路线 B：导出报表 / 视觉对象数据

适用于"必须与报表页面显示完全一致（含页面级、视觉级筛选器）"的场景。

> **容量前提**：`Export To File` 需要 Premium / Fabric 容量或 PPU，
> 且有每日导出配额与并发限制。纳入方案前请先确认容量与配额。

## 1. 导出文件（PDF / PPTX / PNG）

- 动作：Power BI → `Export To File for Power BI Reports`
- 参数：Workspace、Report、Export Format、（可选）页面名、书签、RLS 身份。
- 输出为文件内容，可直接用 OneDrive/SharePoint 的 `Create file` 落盘或作为邮件附件。
- 局限：这些格式**不含结构化数据**，无法直接写入 Excel 表格。

## 2. 更实用的做法：口径对齐的 DAX（推荐）

不要为了"和报表一致"而硬走导出：

1. 在报表中打开目标视觉对象 → **性能分析器 → 复制查询**。
2. 得到的就是该视觉对象背后真实执行的 DAX（已包含筛选器上下文）。
3. 把它作为路线 A 的查询文本使用，即可保证口径与报表一致，同时获得结构化数据。

详见 [`03-flow-route-a.md`](03-flow-route-a.md)。

## 3. 确需视觉对象 CSV 时

1. 用 `HTTP with Azure AD`（**Premium 连接器**）调用 Power BI REST API：
   - `POST /v1.0/myorg/groups/{groupId}/reports/{reportId}/ExportTo`
   - 轮询 `GET .../exports/{exportId}` 直到 `status = Succeeded`
   - `GET .../exports/{exportId}/file` 取回文件内容
2. 得到 CSV 后，用 Office Scripts 解析文本并批量写入 `TB_Log`
   （可在 [`scripts/appendRowsToTable.ts`](scripts/appendRowsToTable.ts) 基础上扩展解析逻辑）。
3. 轮询循环同样要设置 `Do until` 的 Count / Timeout 上限，防止死循环。

## 4. 取舍结论

| 需求 | 建议 |
| --- | --- |
| 要结构化数据入 Excel | 走路线 A（可用性能分析器复制查询保证口径） |
| 要给人看的报表快照（PDF/PPT） | 走本路线的导出动作，落盘或邮件分发 |
| 要与视觉对象完全一致的 CSV | 本路线第 3 节，但需 Premium 且实现成本最高 |

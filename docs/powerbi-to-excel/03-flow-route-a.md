# 三、路线 A（推荐）：DAX 查询语义模型 → 写入 Excel

## 3.1 先写好并验证 DAX

1. 用 **DAX Studio**，或 Power BI Desktop 的"**性能分析器 → 复制查询**"，
   拿到一段 `EVALUATE` 查询。
2. 在 DAX Studio 里先跑一遍，确认结果行数与口径正确。
3. **务必做聚合**：`Run a query against a dataset` 单次最多返回约
   **10 万行 / 1000 万个值**，超时约 10 分钟。不要拉明细大表。
4. 可复用模板见 [`dax/`](dax)：
   - [`summary_by_region.dax`](dax/summary_by_region.dax)：汇总型（按维度聚合）
   - [`incremental_by_date.dax`](dax/incremental_by_date.dax)：增量型（按日期参数化）
   - [`smoke_test_topn.dax`](dax/smoke_test_topn.dax)：小样测试（`TOPN 10`）

## 3.2 流程结构（Cloud Flow）

完整示例定义见 [`flows/powerbi-to-excel-flow.json`](flows/powerbi-to-excel-flow.json)，
可作为"导出的流定义"结构参考，逐动作说明如下。

### 1. 触发器

| 场景 | 触发器 | 配置要点 |
| --- | --- | --- |
| 定时 | `Recurrence` | 例如每天 08:00，**时区设 China Standard Time** |
| 事件驱动 | Power BI → `When a dataset refresh completes` | 保证取到刷新后的最新数据（推荐） |
| 手动测试 | `Manually trigger a flow` | 开发调试期使用 |

### 2. 初始化变量

| 变量 | 类型 | 表达式 |
| --- | --- | --- |
| `varRunId` | String | `guid()` |
| `varRunTime` | String | `convertFromUtc(utcNow(),'China Standard Time','yyyy-MM-dd HH:mm:ss')` |
| `varBizDate` | String | `convertFromUtc(addDays(utcNow(),-1),'China Standard Time','yyyy-MM-dd')`（取"昨天"作为业务日期） |

> 千万不要直接用 `utcNow()` 写入表格，否则会出现 8 小时时差。

### 3.（可选）触发刷新并等待

只有在使用 `Recurrence` 触发、且需要保证数据最新时才需要：

1. Power BI → `Refresh a dataset`。
2. `Do until`：条件为 `刷新状态 等于 Completed`。
   - 循环体内先 `Delay` 1–2 分钟，再调用 `Get refresh history`（取第一条记录的 `status`）。
   - 在 `Do until` 的"限制"里设置 **Count = 30 / Timeout = PT2H**，防止死循环。
3. 若最终状态为 `Failed`，走 Catch 分支发通知并终止。

如果用 `When a dataset refresh completes` 触发器，这一整段可以省略。

### 4. 取数

- 动作：**Power BI → Run a query against a dataset**
- 参数：
  - `Workspace`：目标工作区
  - `Dataset`：目标语义模型
  - `Query Text`：DAX 文本（可用表达式拼接 `varBizDate` 实现增量取数）

拼接示例（把业务日期注入 DAX）：

```
concat(
  'EVALUATE SUMMARIZECOLUMNS( ''DimRegion''[区域], FILTER( ALL(''DimDate''[Date]), ''DimDate''[Date] = DATE(',
  formatDateTime(variables('varBizDate'),'yyyy'), ',',
  formatDateTime(variables('varBizDate'),'MM'), ',',
  formatDateTime(variables('varBizDate'),'dd'),
  ') ), "销售额", [Total Sales], "订单数", [Order Count] )'
)
```

返回结构为 `firstTableRows` 数组，字段名形如 `[区域]`、`[销售额]`（**带方括号**）。

### 5. 解析结果

加一个 `Parse JSON` 动作，`Content` 设为
`@body('Run_a_query_against_a_dataset')?['firstTableRows']`，
Schema 用一次真实运行的输出通过"**使用示例负载生成架构**"生成。

这样后续可直接使用友好字段名，避免手写表达式出错。手写时注意方括号转义：

```
item()?['[销售额]']
```

### 6. 写入 Excel

根据行数选择方式：

#### 方式一：逐行写入（几十到几百行）

`Apply to each`（遍历 `firstTableRows`）+ **Excel Online (Business) → Add a row into a table**。

- 在 `Apply to each` 的设置中开启 **Concurrency Control**，并发度 4–8 可提速。
- 若要求写入顺序严格一致，则**关闭并发**（度数 1）。

#### 方式二：Office Scripts 批量写入（上千行，**大数据量正解**）

用 **Excel Online (Business) → Run script**，把整个 JSON 数组一次性传入脚本，
由脚本用 `table.addRows()` 批量追加。上千次 API 调用被压缩为 1 次。

脚本见 [`scripts/appendRowsToTable.ts`](scripts/appendRowsToTable.ts)，
配套清理脚本见 [`scripts/deleteRowsByDate.ts`](scripts/deleteRowsByDate.ts)。

使用步骤：
1. 在 Excel 网页版打开 `PowerBI_Log.xlsx` → **自动化 → 新建脚本**，粘贴脚本内容并保存为
   `AppendRowsToTable`。
2. 在流中添加 `Run script`，选择该文件与脚本，把参数 `payload` 传入序列化后的 JSON
   （`string()` 包裹或直接传数组，取决于参数类型定义）。

#### 方式三：生成 CSV 快照文件

`Create CSV table` + OneDrive/SharePoint 的 `Create file`，
文件名带日期，例如 `snapshot_@{variables('varBizDate')}.csv`。
适合"每次生成一个独立快照"而非"追加到同一张表"的需求。

### 7. 写入内容设计

每行都带上追溯字段：

| 表列 | 值表达式 |
| --- | --- |
| `记录时间` | `variables('varRunTime')` |
| `日期` | `variables('varBizDate')` |
| `区域` | `item()?['[区域]']` |
| `销售额` | `float(item()?['[销售额]'])` |
| `订单数` | `int(item()?['[订单数]'])` |
| `运行ID` | `variables('varRunId')` |

数值一定要用 `float()` / `int()` 转换，否则会以文本写入。
对可能为 `null` 的度量值，用 `float(coalesce(item()?['[销售额]'], 0))` 兜底。

### 8. 去重 / 幂等（重要）

追加模式重跑会产生重复行。三选一：

1. **先查后写**（推荐）
   - `List rows present in a table`，`Filter Query` 设为
     `日期 eq '@{variables('varBizDate')}'`。
   - 若 `length(body(...)?['value']) > 0`，则跳过写入，或改走 `Update a row`
     （`Key Column` = `日期`+`区域` 组合键列）。
2. **先删后写**
   - 循环 `Delete a row` 删掉当天旧行再写入；行数多时较慢，建议改用
     [`scripts/deleteRowsByDate.ts`](scripts/deleteRowsByDate.ts) 一次性删除。
3. **只增不改**
   - 用 `运行ID` 区分批次，报表侧取最新批次。写入最快，但文件增长也最快。

> 建议在表中额外加一个隐藏的组合键列（如 `日期|区域`），作为 `Update a row` 的
> `Key Column`，比多列匹配可靠得多。

### 9. 错误处理与通知

用 **Try / Catch / Finally 三段式** `Scope` 组织：

- `Scope: Try` —— 取数 + 写入的全部动作。
- `Scope: Catch` —— `Configure run after` 勾选 **has failed / is skipped / has timed out**，
  内部发送 Teams 消息或邮件，正文包含：
  - 流名称：`workflow()?['name']`
  - 运行 ID：`workflow()?['run']?['name']`
  - 失败结果：`result('Try')`
- `Scope: Finally` —— `Configure run after` 勾选全部状态，用于写运行日志。

### 10. 归档（可选）

单独建一个每月运行的流：

1. 复制 `PowerBI_Log.xlsx` 到 `Archive/PowerBI_Log_yyyy-MM.xlsx`。
2. 用 Office Scripts 清空主文件的 `TB_Log` 数据行（保留表头与表结构）。
3. 目的：避免单文件行数过大（建议 ≤ 5 万行）导致连接器变慢。

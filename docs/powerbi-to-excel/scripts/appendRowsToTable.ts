/**
 * Office Script：把 Power Automate 传入的 JSON 数组一次性批量追加到 Excel 表格。
 *
 * 为什么需要它：
 *   "Add a row into a table" 每行一次 API 调用，上千行会非常慢甚至超时；
 *   本脚本用 table.addRows() 一次性写入，把上千次调用压缩为 1 次。
 *
 * Power Automate 用法：
 *   动作 Excel Online (Business) → Run script
 *     - File:        /Documents/PowerBI/PowerBI_Log.xlsx
 *     - Script:      AppendRowsToTable
 *     - tableName:   TB_Log
 *     - payload:     string(变量或 Parse JSON 的输出数组)
 *
 * payload 需要是 JSON 对象数组的字符串，键名与表头一致，例如：
 *   [{"记录时间":"2026-08-17 08:00:00","日期":"2026-08-16","区域":"华东",
 *     "销售额":12345.67,"订单数":89,"运行ID":"..." }]
 *
 * 返回写入的行数，便于在流中记录日志。
 */
function main(
  workbook: ExcelScript.Workbook,
  payload: string,
  tableName: string = "TB_Log"
): number {
  const table = workbook.getTable(tableName);
  if (!table) {
    throw new Error(`找不到名为 "${tableName}" 的表格，请确认已在 Excel 中插入表格并正确命名。`);
  }

  let rows: Record<string, string | number | boolean>[];
  try {
    const parsed: unknown = JSON.parse(payload);
    rows = (Array.isArray(parsed) ? parsed : [parsed]) as Record<
      string,
      string | number | boolean
    >[];
  } catch (e) {
    throw new Error(`payload 不是合法的 JSON 数组：${e}`);
  }

  if (rows.length === 0) {
    return 0;
  }

  // 按表头顺序取值，确保列对齐；缺失的列写入空字符串。
  const headers: string[] = table.getHeaderRowRange().getValues()[0].map(
    (h) => String(h).trim()
  );

  const values: (string | number | boolean)[][] = rows.map((row) =>
    headers.map((header) => {
      const value = row[header];
      return value === undefined || value === null ? "" : value;
    })
  );

  // null 表示追加到表末尾。
  table.addRows(null, values);

  return values.length;
}

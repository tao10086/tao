/**
 * Office Script：按业务日期删除表中的旧行，实现"先删后写"的幂等写入。
 *
 * 为什么需要它：
 *   Excel 连接器的 "Delete a row" 每行一次调用，删几百行就会超时；
 *   本脚本在客户端一次性完成筛选与删除。
 *
 * Power Automate 用法：
 *   动作 Excel Online (Business) → Run script
 *     - Script:     DeleteRowsByDate
 *     - tableName:  TB_Log
 *     - columnName: 日期
 *     - matchValue: @{variables('varBizDate')}   例如 2026-08-16
 *
 * 返回删除的行数。
 */
function main(
  workbook: ExcelScript.Workbook,
  matchValue: string,
  tableName: string = "TB_Log",
  columnName: string = "日期"
): number {
  const table = workbook.getTable(tableName);
  if (!table) {
    throw new Error(`找不到名为 "${tableName}" 的表格。`);
  }

  const column = table.getColumnByName(columnName);
  if (!column) {
    throw new Error(`表 "${tableName}" 中找不到列 "${columnName}"。`);
  }

  // 去掉表头，只保留数据行的值。
  const columnValues: (string | number | boolean)[][] = column
    .getRangeBetweenHeaderAndTotal()
    .getValues();

  // 从后往前删，避免删除过程中索引位移。
  let deleted = 0;
  for (let i = columnValues.length - 1; i >= 0; i--) {
    const cell = columnValues[i][0];
    if (normalize(cell) === matchValue.trim()) {
      table.deleteRowsAt(i, 1);
      deleted++;
    }
  }

  return deleted;
}

/**
 * 把单元格值规范成 yyyy-MM-dd 字符串。
 * Excel 中的日期可能以序列号形式存储，需要换算成日期再比较。
 */
function normalize(cell: string | number | boolean): string {
  if (typeof cell === "number") {
    // Excel 序列号起点为 1899-12-30（UTC）。
    const millis = Math.round(cell * 24 * 60 * 60 * 1000);
    const date = new Date(Date.UTC(1899, 11, 30) + millis);
    return date.toISOString().slice(0, 10);
  }
  return String(cell).trim();
}

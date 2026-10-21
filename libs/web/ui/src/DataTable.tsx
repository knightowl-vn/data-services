import type { Key, ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Cell content. Defaults to `row[key]`. */
  render?: (row: T) => ReactNode;
  align?: "start" | "end";
}

export interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => Key;
  empty?: ReactNode;
  caption?: string;
}

export function DataTable<T>({ columns, rows, rowKey, empty = "Nothing here yet.", caption }: DataTableProps<T>) {
  return (
    <div className="ko-table-wrap">
      <table className="ko-table">
        {caption && <caption className="ko-visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === "end" ? "ko-table__cell--end" : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="ko-table__empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "end" ? "ko-table__cell--end" : undefined}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

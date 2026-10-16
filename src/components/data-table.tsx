import type { ReactNode } from "react";

interface DataTableProps {
  head: ReactNode[];
  rows: ReactNode[][];
}

export function DataTable({ head, rows }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((cell, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 列は固定
              <th key={i}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 行は固定
            <tr key={i}>
              {row.map((cell, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 列は固定
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

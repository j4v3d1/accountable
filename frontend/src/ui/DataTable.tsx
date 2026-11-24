import {
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { EmptyState } from "./States";
import "./ui.css";

export type CellValue = string | number | null | undefined;

export interface TableColumn<T> {
  id: string;
  header: string;
  /** The value used for sorting, and for searching unless searchText is given. */
  value: (row: T) => CellValue;
  /** What to show, if it differs from the value. */
  cell?: (row: T) => ReactNode;
  /** Whether the search box matches this column (text columns). */
  search?: boolean;
  /** The text the search box matches, when the value is for sorting only, such as a stage's place in the pipeline. */
  searchText?: (row: T) => string;
  align?: "left" | "right";
  mono?: boolean;
  /** Keep the value on one line, such as a phone number. */
  nowrap?: boolean;
}

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

interface DataTableProps<T extends RowData> {
  rows: T[];
  columns: TableColumn<T>[];
  searchLabel: string;
  rowHref: (row: T) => string;
  rowLabel: (row: T) => string;
  emptyMessage: ReactNode;
  emptyAction?: ReactNode;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** Extra controls beside the search box, such as a filter. */
  filters?: ReactNode;
}

/** A searchable, sortable table with edit and delete on each row (R2). Searching and sorting happen in the browser. */
export function DataTable<T extends RowData>({
  rows,
  columns,
  searchLabel,
  rowHref,
  rowLabel,
  emptyMessage,
  emptyAction,
  onEdit,
  onDelete,
  filters,
}: DataTableProps<T>) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const columnDefs = useMemo(
    () =>
      columns.map((column) => {
        const sample = rows.map(column.value).find((v) => v !== null && v !== undefined);
        return {
          id: column.id,
          header: column.header,
          accessorFn: (row: T) => column.value(row) ?? undefined,
          enableGlobalFilter: column.search === true || column.searchText !== undefined,
          sortFn: typeof sample === "number" ? ("basic" as const) : ("alphanumeric" as const),
          sortDescFirst: false,
          sortUndefined: "last" as const,
        };
      }),
    [columns, rows],
  );
  const byId = new Map(columns.map((column) => [column.id, column]));

  const table = useTable({
    features,
    columns: columnDefs,
    data: rows,
    state: { globalFilter: search },
    onGlobalFilterChange: (updater) =>
      setSearch((current) => (typeof updater === "function" ? updater(current) : updater) ?? ""),
    // Matches the column's search text if it has one, otherwise its value, ignoring case.
    globalFilterFn: (row, columnId, filterValue) => {
      const column = byId.get(columnId);
      const text = column?.searchText ? column.searchText(row.original) : row.getValue(columnId);
      return text != null && String(text).toLowerCase().includes(String(filterValue).toLowerCase());
    },
    enableMultiSort: false,
  });

  const visibleRows = table.getRowModel().rows;
  const hasActions = Boolean(onEdit || onDelete);

  function openRow(event: MouseEvent, row: T) {
    if ((event.target as HTMLElement).closest("a, button, input")) return;
    navigate(rowHref(row));
  }

  return (
    <div className="panel table-panel">
      <div className="table-toolbar">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label={searchLabel}
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {filters}
      </div>
      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} action={emptyAction} />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const column = byId.get(header.column.id)!;
                    const sorted = header.column.getIsSorted();
                    const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                    return (
                      <th
                        key={header.id}
                        className={column.align === "right" ? "align-right" : undefined}
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      >
                        <button
                          type="button"
                          className={sorted ? "sort-button sorted" : "sort-button"}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {column.header}
                          <SortIcon size={13} aria-hidden="true" />
                        </button>
                      </th>
                    );
                  })}
                  {hasActions && (
                    <th className="actions-col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} onClick={(event) => openRow(event, row.original)}>
                  {row.getAllCells().map((cell, index) => {
                    const column = byId.get(cell.column.id)!;
                    const content = column.cell ? column.cell(row.original) : (column.value(row.original) ?? "");
                    const className = [
                      column.align === "right" && "align-right",
                      column.mono && "mono",
                      column.nowrap && "nowrap",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td key={cell.id} className={className || undefined}>
                        {index === 0 ? (
                          <Link to={rowHref(row.original)} className="row-link">
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className="actions-col">
                      <div className="row-actions">
                        {onEdit && (
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Edit ${rowLabel(row.original)}`}
                            title="Edit"
                            onClick={() => onEdit(row.original)}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            className="icon-button danger"
                            aria-label={`Delete ${rowLabel(row.original)}`}
                            title="Delete"
                            onClick={() => onDelete(row.original)}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 && <p className="table-empty">No matches for "{search}".</p>}
        </div>
      )}
    </div>
  );
}

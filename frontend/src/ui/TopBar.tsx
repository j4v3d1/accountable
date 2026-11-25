import type { ReactNode } from "react";
import "./layout.css";

interface Props {
  /** The search box, on the left (R58). */
  search?: ReactNode;
  /** The user menu, on the right (R6a). */
  account?: ReactNode;
}

/** The bar across the top of every page, to the right of the rail (R1). */
export function TopBar({ search, account }: Props) {
  return (
    <header className="top-bar">
      <div className="top-bar-search">{search}</div>
      <div className="top-bar-account">{account}</div>
    </header>
  );
}

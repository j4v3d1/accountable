import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { Rail } from "./Rail";

/** The rail down the left, then the top bar over the page. */
export function AppLayout({ topBar }: { topBar: ReactNode }) {
  return (
    <div className="app">
      <Rail />
      <div className="app-column">
        {topBar}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

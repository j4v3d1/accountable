import { Outlet } from "react-router";
import { Rail } from "./Rail";

export function AppLayout() {
  return (
    <div className="app">
      <Rail />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

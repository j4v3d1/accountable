import { Briefcase, Building2, Kanban, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import "./layout.css";
import { ThemeToggle } from "./ThemeToggle";

const SECTIONS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/organizations", label: "Orgs", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/deals", label: "Deals", icon: Briefcase },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
];

export function Rail() {
  return (
    <nav className="rail" aria-label="Main">
      <div className="rail-logo" aria-hidden="true">
        A
      </div>
      {SECTIONS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="rail-link">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="rail-icon" />
          {label}
        </NavLink>
      ))}
      <ThemeToggle />
    </nav>
  );
}

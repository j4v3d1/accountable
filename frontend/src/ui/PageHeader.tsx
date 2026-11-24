import type { ReactNode } from "react";
import "./ui.css";

interface Props {
  eyebrow?: ReactNode;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, lede, actions }: Props) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {lede && <div className="page-lede">{lede}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

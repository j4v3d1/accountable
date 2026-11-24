import { Link } from "react-router";
import { PageHeader } from "./PageHeader";

export function NotFoundPage() {
  return (
    <div className="page">
      <PageHeader title="Page not found" lede="There's no page at this address." />
      <p>
        <Link to="/">Go to the dashboard</Link>
      </p>
    </div>
  );
}

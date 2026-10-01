import { Link } from "@tanstack/react-router";
import { NAV } from "./Header";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="section-title text-sm">Skill <span className="text-primary">Bridgeway</span> Foundation</p>
          <p className="mt-3 text-sm text-muted-foreground">
            A non-profit in Bangladesh building skills in AI, freelancing and digital work.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-primary">{n.label}</Link>
          ))}
        </nav>
        <div className="text-sm text-muted-foreground md:text-right">
          <Link to="/admission" className="text-highlight hover:underline">Free admission open</Link>
          <p className="mt-3">© {new Date().getFullYear()} Skill Bridgeway Foundation</p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";
import { NAV } from "./Header";
import logo from "@/assets/sbf-logo.jpeg.asset.json";

export function Footer() {
  return (
    <footer className="bg-grid border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <img src={logo.url} alt="Skill Bridgeway Foundation logo" width={88} height={88} loading="lazy" className="h-22 w-22 rounded-full" />
          <p className="mt-4 text-sm text-muted-foreground">
            A non-profit in Bangladesh building skills in AI, freelancing and digital work — for free.
          </p>
        </div>
        <div>
          <p className="section-title text-sm">Explore</p>
          <nav className="mt-4 grid gap-2 text-sm">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-primary">{n.label}</Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="section-title text-sm">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" />Dhaka, Bangladesh</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-primary" />
              <a href="mailto:info@skillbridgeway.org" className="hover:text-primary">info@skillbridgeway.org</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="section-title text-sm">Start learning</p>
          <p className="mt-4 text-sm text-muted-foreground">Admission is completely free.</p>
          <Link to="/admission" className="mt-4 inline-flex rounded-md bg-highlight px-4 py-2 text-sm font-semibold text-highlight-foreground hover:bg-highlight/90">
            Free Admission
          </Link>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground">© {new Date().getFullYear()} Skill Bridgeway Foundation. All rights reserved.</p>
      </div>
    </footer>
  );
}

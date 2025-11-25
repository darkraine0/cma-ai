"use client"

import Link from "next/link";
import { Fragment } from "react/jsx-runtime";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";

const Navbar = () => (
  <Fragment>
    <div className="bg-card border-b border-border shadow-card">
      <nav className="container mx-auto py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-foreground tracking-tight select-none cursor-pointer">
            MarketMap Homes
          </Link>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/">
              <Button
                variant="outline"
                className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
              >
                Communities
              </Button>
            </Link>
          <Link href="/companies">
            <Button 
              variant="outline"
              className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
            >
              Companies
            </Button>
          </Link>
          <Link href="/manage">
            <Button 
              variant="outline"
              className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
            >
              Manage
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </div>
  </Fragment>
);

export default Navbar;


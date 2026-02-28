"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Home,
  LayoutGrid,
  PlusCircle,
  Briefcase,
  Activity,
  BookOpen,
  Settings,
  Wallet,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/markets", label: "Markets", icon: LayoutGrid },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
          {/* Logo */}
          <Link href="/" className="mr-6 flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              ZenGuess
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" className="hidden sm:inline-flex">
              <Wallet className="mr-1.5 size-4" />
              Connect Wallet
            </Button>
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
            <Button size="sm" className="mt-2 w-full">
              <Wallet className="mr-1.5 size-4" />
              Connect Wallet
            </Button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>ZenGuess</span>
          </div>
          <p className="text-center text-xs">
            Powered by Horizen L3 (OP Stack). Not financial advice. Trade
            responsibly.
          </p>
          <div className="flex gap-4">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <a
              href="https://horizen.calderaexplorer.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

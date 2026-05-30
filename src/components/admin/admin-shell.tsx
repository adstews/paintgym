"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  {
    href: "/admin/concepts",
    label: "Concepts",
    match: (p) => p.startsWith("/admin/concepts"),
  },
  {
    href: "/admin/users",
    label: "Users",
    match: (p) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (p) => p.startsWith("/admin/settings"),
  },
];

interface Props {
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ email, children }: Props) {
  const pathname = usePathname() ?? "";
  const initial = email.slice(0, 1).toUpperCase();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              paintgym
            </Link>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              admin
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              <Avatar>
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/dashboard">App</Link>} />
              <DropdownMenuItem render={<Link href="/admin/concepts">Admin</Link>} />
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <form action="/api/auth/signout" method="post" className="w-full">
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:flex-row sm:py-8">
        <aside className="sm:w-48 sm:shrink-0">
          <nav className="flex flex-row gap-1 sm:flex-col">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({
                      variant: active ? "secondary" : "ghost",
                      size: "sm",
                    }),
                    "justify-start",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const initial = email.slice(0, 1).toUpperCase();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            paintgym
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost" })}
            >
              Projects
            </Link>
            <Link
              href="/concepts"
              className={buttonVariants({ variant: "ghost" })}
            >
              Concepts
            </Link>
          </nav>
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
              <DropdownMenuItem
                render={<Link href="/dashboard">Projects</Link>}
              />
              <DropdownMenuItem
                render={<Link href="/concepts">Concepts</Link>}
              />
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
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>
    </div>
  );
}

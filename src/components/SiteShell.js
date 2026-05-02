import Link from "next/link";
import { Music2 } from "lucide-react";

import { Button } from "@/components/ui/8bit/button";

export default function SiteShell({ children, userData, onLogout }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Music2 className="h-5 w-5" />
            Songle
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/songle" className="px-2 py-1 font-bold hover:underline">
              Daily Songle
            </Link>
            <Link href="/quiz" className="px-2 py-1 font-bold hover:underline">
              Music Quiz
            </Link>
            {userData ? (
              <Button onClick={onLogout} className="ml-1">
                Logout
              </Button>
            ) : (
              <Button onClick={() => window.location.assign("/login")} className="ml-1">
                Login
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-background/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>Songle runs on Spotify playback. Invited Spotify developer users only.</p>
          <p>Daily challenge or live room. Your pick.</p>
        </div>
      </footer>
    </div>
  );
}

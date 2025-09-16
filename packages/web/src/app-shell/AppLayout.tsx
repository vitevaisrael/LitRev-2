import { AppShell } from "./AppShell";
import { flags } from "../config/features";
import { useLocation } from "react-router-dom";

const PUBLIC_PREFIXES = ["/login", "/auth", "/callback", "/reset-password"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  // If feature is off or global shell is off, do nothing.
  if (!(flags as any).APP_LAYOUT || !flags.GLOBAL_MENU) return <>{children}</>;

  const { pathname } = useLocation();
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return isPublic ? <>{children}</> : <AppShell>{children}</AppShell>;
}


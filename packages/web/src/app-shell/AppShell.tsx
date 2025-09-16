import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader />
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0">
        <AppSidebar />
        <main className="min-h-[calc(100vh-56px)] bg-white">{children}</main>
      </div>
    </div>
  );
}

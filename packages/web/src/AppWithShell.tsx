import App from "./App";
import { flags } from "./config/features";
import { AppShell } from "./app-shell/AppShell";

export default function AppWithShell() {
  // When per-route AppLayout is enabled, let it manage wrapping inside <App />
  if ((flags as any).APP_LAYOUT) {
    return <App />;
  }
  // Legacy/global wrapping when APP_LAYOUT is off
  if (flags.GLOBAL_MENU) {
    return (
      <AppShell>
        <App />
      </AppShell>
    );
  }
  return <App />;
}

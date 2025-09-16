import App from "./App";
import { flags } from "./config/features";
import { AppShell } from "./app-shell/AppShell";

export default function AppWithShell() {
  if (flags.GLOBAL_MENU) {
    return (
      <AppShell>
        <App />
      </AppShell>
    );
  }
  return <App />;
}

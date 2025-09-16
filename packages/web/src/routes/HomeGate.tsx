import { flags } from "../config/features";
import HomePage from "../pages/Home";

export default function HomeGate() {
  if (!flags.HOME) return <div style={{ padding: 24 }}>Home is disabled.</div>;
  return <HomePage />;
}

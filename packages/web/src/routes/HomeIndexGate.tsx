import { flags } from "../config/features";
import { Navigate } from "react-router-dom";

export default function HomeIndexGate() {
  if (flags.HOME && (flags as any).HOME_AS_DEFAULT) {
    return <Navigate to="/home" replace />;
  }
  // When disabled, render nothing so any existing "/" route can render.
  return null;
}

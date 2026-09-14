import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/ds/Dashboard";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <Dashboard />;
}

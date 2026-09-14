import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/components/ds/HistoryPage";

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});

function HistoryRoute() {
  return <HistoryPage />;
}

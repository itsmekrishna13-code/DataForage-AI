import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/config";
import { CardShell, SectionHeader } from "./primitives";
import { Database, Calendar, PlayCircle, ExternalLink } from "lucide-react";

export function HistoryPage() {
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["user-history"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/user/history`, {credentials: "include"});
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  return (
    <div className="flex h-screen flex-col bg-background p-6 overflow-y-auto">
      <SectionHeader
        title="My Reports & History"
        caption="View past sessions, trained models, and generated reports."
      />
      
      {historyLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading history...</div>
      ) : history?.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No history found. Upload a dataset to get started!</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {history?.map((session: any) => (
            <CardShell key={session.job_id} className="flex flex-col h-full">
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between">
                  <div className="font-semibold">{session.filename}</div>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(session.created_at).toLocaleString()}</span>
                  </div>
                  {session.metadata?.target_column && (
                    <div className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      <span>Target: <span className="font-medium text-foreground">{session.metadata.target_column}</span></span>
                    </div>
                  )}
                  {session.metadata?.best_model && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      <span>Best Model: <span className="font-medium text-foreground">{session.metadata.best_model}</span></span>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t p-4 flex gap-2">
                {session.metadata?.has_report && (
                  <a
                    href={`${API_BASE_URL}/report/${session.job_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/80 text-foreground"
                  >
                    View Report
                  </a>
                )}
              </div>
            </CardShell>
          ))}
        </div>
      )}
    </div>
  );
}

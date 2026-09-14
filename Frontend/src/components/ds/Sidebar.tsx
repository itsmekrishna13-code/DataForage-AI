import { useState } from "react";
import {
  Upload,
  BarChart3,
  Layers,
  Sparkles,
  Wand2,
  Target,
  Cpu,
  Play,
  LineChart,
  MessageSquare,
  FileDown,
  Package,
  Bot,
  Menu,
  X,
  Grid2x2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/config";
import { Link } from "@tanstack/react-router";

export type SectionId =
  | "upload"
  | "overview"
  | "eda"
  | "classify"
  | "insights"
  | "features"
  | "target"
  | "problem"
  | "train"
  | "predict"
  | "viz"
  | "chatchart"
  | "reports"
  | "export"
  | "chat";

export const NAV: { id: SectionId; label: string; icon: React.ElementType; group: string }[] = [
  { id: "upload", label: "Upload", icon: Upload, group: "Data" },
  { id: "overview", label: "Overview", icon: Grid2x2, group: "Data" },
  { id: "eda", label: "EDA", icon: BarChart3, group: "Data" },
  { id: "classify", label: "Columns", icon: Layers, group: "Data" },
  { id: "insights", label: "Auto Insights", icon: Sparkles, group: "AI" },
  { id: "features", label: "Feature Suggestions", icon: Wand2, group: "AI" },
  { id: "target", label: "Target Suggestion", icon: Target, group: "AI" },
  { id: "problem", label: "Problem Type", icon: ListChecks, group: "AI" },
  { id: "train", label: "Model Training", icon: Cpu, group: "Modeling" },
  { id: "predict", label: "Predict", icon: Play, group: "Modeling" },
  { id: "viz", label: "Visualizations", icon: LineChart, group: "Explore" },
  { id: "chatchart", label: "Chat to Chart", icon: MessageSquare, group: "Explore" },
  { id: "reports", label: "Reports", icon: FileDown, group: "Deliver" },
  { id: "export", label: "Production Export", icon: Package, group: "Deliver" },
  { id: "chat", label: "Chat with Data", icon: Bot, group: "Deliver" },
];

export function Sidebar({
  active,
  onSelect,
  datasetName,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  datasetName?: string;
}) {
  const [open, setOpen] = useState(false);
  const grouped = NAV.reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const nav = (
    <nav className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
          DS
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm font-bold leading-tight">DataForge AI</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {datasetName ?? "No dataset loaded"}
          </div>
        </div>
      </div>
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.map((it) => {
              const Icon = it.icon;
              const isActive = active === it.id;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => {
                      onSelect(it.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[color:var(--sidebar-accent)] text-[color:var(--sidebar-accent-foreground)]"
                        : "text-foreground/80 hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{it.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto px-4 py-4 border-t border-border/50">
        <UserStatus />
      </div>
    </nav>
  );

function UserStatus() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {credentials: "include"});
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const isAuthed = user?.authenticated === true;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {user?.picture ? (
          <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-secondary" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user?.name ?? "Guest"}</span>
          <span className="text-xs text-muted-foreground truncate w-32">
            {isAuthed ? user.email : "Guest — no login needed"}
          </span>
        </div>
      </div>
      <Link
        to="/history"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ListChecks className="h-4 w-4" />
        My Reports
      </Link>
      {isAuthed && (
        <button
          onClick={async () => {
            await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
            window.location.reload();
          }}
          className="text-left text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      )}
    </div>
  );
}

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold text-xs">
            DS
          </div>
          <div className="font-display font-bold text-sm">DataForge AI</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r bg-[color:var(--sidebar)] md:block">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r bg-[color:var(--sidebar)]">
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

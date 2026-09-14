import { useEffect, useMemo, useRef, useState } from "react";
import {
  Rows3,
  Columns3,
  AlertTriangle,
  Copy,
  RefreshCw,
  Check,
  X as XIcon,
  Info,
  Download,
  FileCode2,
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  Target,
  BarChart3,
  BrainCircuit,
  MessageSquareText,
  CheckCircle2,
  Database,
  FlaskConical,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  Area,
  AreaChart,
} from "recharts";
import { toast } from "sonner";

import { CardShell, InsightCard, Pill, SectionHeader, StatCard } from "./primitives";
import { UploadZone } from "./UploadZone";
import { Sidebar, type SectionId, NAV } from "./Sidebar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { api, type UploadResult } from "@/services/api";
import { mockClassificationReport } from "@/lib/mockData";

const TEAL = "#0F766E";
const TEAL_SOFT = "#99F6E4";
const RED = "#DC2626";
const CHART_COLORS = [
  "#0F766E", // Teal
  "#14B8A6", // Teal-500
  "#0D9488", // Teal-600
  "#2DD4BF", // Teal-400
  "#5EEAD4", // Teal-300
  "#99F6E4", // Teal-200
  "#CCFBF1", // Teal-100
];

import { useDataset } from "@/context/DatasetContext";

export function Dashboard() {
  const [active, setActive] = useState<SectionId>("upload");
  const { jobId, filename, hasData, setDataset, clearDataset } = useDataset();
  const [versionTrigger, setVersionTrigger] = useState(0);
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>(
    {} as Record<SectionId, HTMLElement | null>
  );

  const handleSelect = (id: SectionId) => {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFile = async (file: File) => {
    try {
      const res = await api.uploadDataset(file);
      setDataset(res.job_id, file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload dataset");
    }
  };

  const handleSample = async () => {
    try {
      const res = await api.loadSampleDataset();
      setDataset(res.job_id, "sample_dataset.csv");
      toast.success("Sample dataset loaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to load sample dataset");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={active} onSelect={handleSelect} datasetName={filename ?? undefined} />

      <main className="min-w-0 flex-1">
        {/* Breadcrumb / title */}
        <div className="sticky top-0 z-20 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">DataForge AI</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">
              {NAV.find((n) => n.id === active)?.label ?? "Workspace"}
            </span>
            {filename && (
              <>
                <span className="text-muted-foreground">·</span>
                <Pill tone="primary">{filename}</Pill>
              </>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 md:px-8 md:py-10">
          <Section id="upload" refs={sectionRefs}>
            <SectionHeader
              title="1. Upload Dataset"
              caption="Drop a CSV to power every step below, or load our sample."
            />
            <div className="mt-5">
              <UploadZone
                filename={filename ?? undefined}
                sizeBytes={undefined}
                rows={undefined}
                cols={undefined}
                onFile={handleFile}
                onSample={handleSample}
                onClear={clearDataset}
              />
            </div>
          </Section>

          <Section id="overview" refs={sectionRefs}>
            <SectionHeader title="2. Overview" caption="High-level snapshot of the dataset." />
            <OverviewSection hasData={hasData} refs={sectionRefs} />
          </Section>

          <EDASection hasData={hasData} refs={sectionRefs} />
          <ColumnClassificationSection hasData={hasData} refs={sectionRefs} />
          <InsightsSection hasData={hasData} refs={sectionRefs} />
          <FeatureSuggestionsSection hasData={hasData} refs={sectionRefs} />
          <TargetSection hasData={hasData} refs={sectionRefs} />
          <ProblemTypeSection hasData={hasData} refs={sectionRefs} />
          <TrainingSection hasData={hasData} refs={sectionRefs} onTrainSuccess={() => setVersionTrigger((v) => v + 1)} />
          <PredictSection hasData={hasData} refs={sectionRefs} versionTrigger={versionTrigger} />
          <VisualizationsSection hasData={hasData} refs={sectionRefs} />
          <ChatToChartSection hasData={hasData} refs={sectionRefs} />
          <ReportsSection hasData={hasData} jobId={jobId ?? ""} refs={sectionRefs} />
          <ExportSection hasData={hasData} jobId={jobId ?? ""} refs={sectionRefs} versionTrigger={versionTrigger} />
          <ChatSection hasData={hasData} refs={sectionRefs} />

          <footer className="border-t pt-6 text-xs text-muted-foreground">
            DataForge AI · Wire the stubs in{" "}
            <code className="rounded bg-secondary px-1 py-0.5 font-mono-num">
              services/api.ts
            </code>{" "}
            to your FastAPI backend.
          </footer>
        </div>
      </main>
    </div>
  );
}

type RefMap = React.MutableRefObject<Record<SectionId, HTMLElement | null>>;

function Section({
  id,
  refs,
  children,
}: {
  id: SectionId;
  refs: RefMap;
  children: React.ReactNode;
}) {
  return (
    <section
      ref={(el) => {
        refs.current[id] = el;
      }}
      className="scroll-mt-20"
    >
      {children}
    </section>
  );
}

type EmptyStatePreset =
  | "no-dataset"
  | "no-target"
  | "no-visualization"
  | "no-model"
  | "no-chat"
  | "no-data"
  | "success";

const EMPTY_STATE_MAP: Record<
  EmptyStatePreset,
  { icon: React.ReactNode; title: string; description: string }
> = {
  "no-dataset": {
    icon: <FileSpreadsheet className="h-8 w-8" />,
    title: "No Dataset Uploaded",
    description: "Upload a CSV dataset to begin analysis.",
  },
  "no-target": {
    icon: <Target className="h-8 w-8" />,
    title: "No Target Selected",
    description: "Choose a target column to generate ML insights.",
  },
  "no-visualization": {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "No Visualization",
    description: "No chart can be generated for the selected data.",
  },
  "no-model": {
    icon: <BrainCircuit className="h-8 w-8" />,
    title: "No Prediction Model",
    description: "Train a model before making predictions.",
  },
  "no-chat": {
    icon: <MessageSquareText className="h-8 w-8" />,
    title: "No Chat History",
    description: "Ask a question about your dataset.",
  },
  "no-data": {
    icon: <Database className="h-8 w-8" />,
    title: "No Data Available",
    description: "Upload a dataset to see this section.",
  },
  "success": {
    icon: <CheckCircle2 className="h-8 w-8 text-emerald-500" />,
    title: "All Clear",
    description: "",
  },
};

function EmptyState({
  label,
  preset,
  description,
}: {
  label?: string;
  preset?: EmptyStatePreset;
  description?: string;
}) {
  if (preset) {
    const { icon, title, description: defaultDesc } = EMPTY_STATE_MAP[preset];
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed p-10 text-center">
        <div className="text-muted-foreground/50">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description ?? defaultDesc}</p>
        </div>
      </div>
    );
  }
  // Legacy label-based fallback — auto-map to a preset based on content
  const lc = (label ?? "").toLowerCase();
  let resolvedPreset: EmptyStatePreset = "no-data";
  if (lc.includes("upload a dataset")) resolvedPreset = "no-dataset";
  else if (lc.includes("train model") || lc.includes("train a model") || lc.includes("train models in section") || lc.includes("no models trained") || lc.includes("no feature columns found")) resolvedPreset = "no-model";
  else if (lc.includes("configure models") || lc.includes("no target")) resolvedPreset = "no-target";
  else if (lc.includes("no visualization") || lc.includes("not enough") || lc.includes("no numeric") || lc.includes("no categorical") || lc.includes("no distribution") || lc.includes("no feature importance") || lc.includes("no target histogram") || lc.includes("no scatter") || lc.includes("no chart")) resolvedPreset = "no-visualization";
  else if (lc.includes("great news") || lc.includes("no missing values")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed p-10 text-center">
        <div className="text-emerald-500">{EMPTY_STATE_MAP["success"].icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">All Clear</p>
          <p className="mt-0.5 text-xs text-muted-foreground">No missing values found in this dataset!</p>
        </div>
      </div>
    );
  }
  const { icon, title, description: defDesc } = EMPTY_STATE_MAP[resolvedPreset];
  const finalDesc = description ?? (resolvedPreset === "no-data" ? (label ?? defDesc) : defDesc);
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed p-10 text-center">
      <div className="text-muted-foreground/50">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{finalDesc}</p>
      </div>
    </div>
  );
}

/* ---------------- Overview + EDA (shared fetch) ---------------- */
// Both Overview cards and the EDA tables read from the same GET /eda/{job_id} response.
// Backend shape: { shape: {rows, columns}, missing_values: {total, percentage, by_column},
//                  duplicate_rows, column_info: {col: dtype}, basic_statistics }
function useEDAData(hasData: boolean, jobId: string | null) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasData || !jobId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEDA(jobId)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || "EDA failed");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  return { data, loading, error };
}

// Helper: convert backend `column_info` dict and `basic_statistics` into table rows.
function toMissingRows(by_column: Record<string, number>, rows: number): { column: string; missing: number; pct: number }[] {
  return Object.entries(by_column)
    .filter(([, n]) => n > 0)
    .map(([col, n]) => ({ column: col, missing: n, pct: rows > 0 ? Math.round((n / rows) * 10000) / 100 : 0 }));
}

function toColumnRows(column_info: Record<string, string>): { name: string; dtype: string }[] {
  return Object.entries(column_info).map(([name, dtype]) => ({ name, dtype }));
}

function toStatsRows(basic_statistics: Record<string, Record<string, number>>): { column: string; mean: number; std: number; min: number; q25: number; q50: number; q75: number; max: number }[] {
  // basic_statistics is df.describe().to_dict() → { "mean": {col: val}, "std": {...}, ... }
  const cols = Object.keys(basic_statistics["mean"] ?? {});
  return cols.map((col) => ({
    column: col,
    mean: Math.round((basic_statistics["mean"]?.[col] ?? 0) * 100) / 100,
    std: Math.round((basic_statistics["std"]?.[col] ?? 0) * 100) / 100,
    min: Math.round((basic_statistics["min"]?.[col] ?? 0) * 100) / 100,
    q25: Math.round((basic_statistics["25%"]?.[col] ?? 0) * 100) / 100,
    q50: Math.round((basic_statistics["50%"]?.[col] ?? 0) * 100) / 100,
    q75: Math.round((basic_statistics["75%"]?.[col] ?? 0) * 100) / 100,
    max: Math.round((basic_statistics["max"]?.[col] ?? 0) * 100) / 100,
  }));
}

function OverviewSection({ hasData, refs: _refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const { data, loading } = useEDAData(hasData, jobId);

  if (!hasData) {
    return (
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[10px]" />
        ))}
      </div>
    );
  }

  const rows: number = data.shape?.rows ?? 0;
  const cols: number = data.shape?.columns ?? 0;
  const missingPct: number = data.missing_values?.percentage ?? 0;
  const duplicates: number = data.duplicate_rows ?? 0;
  const missingColCount = Object.values(data.missing_values?.by_column ?? {}).filter((v) => (v as number) > 0).length;
  const numericCount = Object.values(data.column_info ?? {}).filter((t) =>
    (t as string).startsWith("int") || (t as string).startsWith("float")
  ).length;
  const catCount = cols - numericCount;

  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Rows3}
        label="Total Rows"
        value={rows.toLocaleString()}
        footer="Ingested from CSV"
        status="success"
        statusLabel="Healthy"
      />
      <StatCard
        icon={Columns3}
        label="Total Columns"
        value={cols}
        footer={`${numericCount} numeric · ${catCount} other`}
        status="neutral"
        statusLabel="Typed"
      />
      <StatCard
        icon={AlertTriangle}
        label="Missing Values"
        value={`${missingPct}%`}
        footer={`${missingColCount} column${missingColCount !== 1 ? "s" : ""} affected`}
        status={missingPct > 0 ? "error" : "success"}
        statusLabel={missingPct > 0 ? "Review" : "Clean"}
      />
      <StatCard
        icon={Copy}
        label="Duplicate Rows"
        value={duplicates}
        footer={rows > 0 ? `${((duplicates / rows) * 100).toFixed(1)}% of dataset` : ""}
        status={duplicates > 0 ? "neutral" : "success"}
        statusLabel={duplicates > 0 ? "Minor" : "None"}
      />
    </div>
  );
}

/* ---------------- EDA ---------------- */
function EDASection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const { data, loading, error } = useEDAData(hasData, jobId);

  // Derive table rows from the backend response shape
  const missingRows = data ? toMissingRows(data.missing_values?.by_column ?? {}, data.shape?.rows ?? 0) : [];
  const columnRows = data ? toColumnRows(data.column_info ?? {}) : [];
  const statsRows = data ? toStatsRows(data.basic_statistics ?? {}) : [];

  return (
    <Section id="eda" refs={refs}>
      <SectionHeader
        title="3. Exploratory Data Analysis"
        caption="Missingness, dtypes, and descriptive statistics."
      />
      {!hasData ? (
        <div className="mt-5">
          <EmptyState label="Upload a dataset to see EDA." />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-[10px] border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          EDA failed: {error}
        </div>
      ) : loading || !data ? (
        <div className="mt-5 space-y-4">
          <Skeleton className="h-40 rounded-[10px]" />
          <Skeleton className="h-56 rounded-[10px]" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <CardShell className="p-5">
            <h3 className="font-display font-semibold">Missing Values</h3>
            {missingRows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No missing values detected — dataset is complete.</p>
            ) : (
              <DataTable
                className="mt-3"
                columns={[
                  { key: "column", label: "Column" },
                  { key: "missing", label: "Missing", numeric: true },
                  { key: "pct", label: "%", numeric: true, format: (v) => `${v}%` },
                ]}
                rows={missingRows}
              />
            )}
          </CardShell>

          <CardShell className="p-5">
            <h3 className="font-display font-semibold">Column Info</h3>
            <DataTable
              className="mt-3"
              columns={[
                { key: "name", label: "Name" },
                {
                  key: "dtype",
                  label: "Type",
                  render: (v) => <Pill tone="neutral">{v as string}</Pill>,
                },
              ]}
              rows={columnRows}
            />
          </CardShell>

          {statsRows.length > 0 && (
            <CardShell className="p-5">
              <h3 className="font-display font-semibold">Descriptive Statistics</h3>
              <DataTable
                className="mt-3"
                columns={[
                  { key: "column", label: "Column" },
                  { key: "mean", label: "Mean", numeric: true },
                  { key: "std", label: "Std", numeric: true },
                  { key: "min", label: "Min", numeric: true },
                  { key: "q25", label: "25%", numeric: true },
                  { key: "q50", label: "50%", numeric: true },
                  { key: "q75", label: "75%", numeric: true },
                  { key: "max", label: "Max", numeric: true },
                ]}
                rows={statsRows}
              />
            </CardShell>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------------- Column Classification ---------------- */
function ColumnClassificationSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getColumnClassification>> | null>(null);

  useEffect(() => {
    if (!hasData || !jobId) {
      setData(null);
      return;
    }
    let cancelled = false;
    api.getColumnClassification(jobId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  const groups = [
    { key: "numeric", label: "Numeric", tone: "primary" as const },
    { key: "categorical", label: "Categorical", tone: "success" as const },
    { key: "text", label: "Text (High-Cardinality)", tone: "neutral" as const },
    { key: "date", label: "Date · Year", tone: "error" as const },
  ];

  return (
    <Section id="classify" refs={refs}>
      <SectionHeader
        title="4. Column Classification"
        caption="Automatically detected column roles."
      />
      {!hasData ? (
        <div className="mt-5">
          <EmptyState label="Upload a dataset to classify columns." />
        </div>
      ) : !data ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-[10px]" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => {
            const cols = (data as Record<string, string[]>)[g.key];
            return (
              <CardShell key={g.key} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">{g.label}</h3>
                  <span className="font-mono-num text-xs text-muted-foreground">
                    {cols.length}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cols.length === 0 ? (
                    <span className="text-xs text-muted-foreground">None</span>
                  ) : (
                    cols.map((c) => (
                      <Pill key={c} tone={g.tone}>
                        {c}
                      </Pill>
                    ))
                  )}
                </div>
              </CardShell>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ---------------- Auto Insights ---------------- */
function InsightsSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [items, setItems] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (jobIdParam: string) => {
    setLoading(true);
    try {
      const mapping = await api.getChartInsights(jobIdParam);
      // flatten all insight arrays into a single list for display
      const flat: string[] = [];
      Object.values(mapping).forEach((arr) => {
        if (Array.isArray(arr)) flat.push(...arr);
      });
      setItems(flat);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasData || !jobId) {
      setItems(null);
      return;
    }
    load(jobId);
  }, [hasData, jobId]);

  return (
    <Section id="insights" refs={refs}>
      <SectionHeader
        title="5. Auto Insights"
        caption="AI-generated highlights from your dataset."
        action={
          hasData && jobId && (
            <Button variant="ghost" size="sm" onClick={() => load(jobId)} disabled={loading} className="gap-1">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Regenerate
            </Button>
          )
        }
      />
      <div className="mt-5">
        {!hasData ? (
          <EmptyState label="Upload a dataset to generate insights." />
        ) : loading || !items ? (
          <Skeleton className="h-40 rounded-[10px]" />
        ) : (
          <InsightCard>
            <ul className="space-y-2 text-sm text-foreground">
              {items.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </InsightCard>
        )}
      </div>
    </Section>
  );
}

/* ---------------- Feature Suggestions ---------------- */
function FeatureSuggestionsSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [items, setItems] = useState<any | null>(null);
  const [state, setState] = useState<Record<string, "accepted" | "rejected" | undefined>>({});

  useEffect(() => {
    if (!hasData || !jobId) {
      setItems(null);
      setState({});
      return;
    }
    let cancelled = false;
    api.getFeatureSuggestions(jobId).then((res) => {
      if (!cancelled) setItems(res.suggestions || []);
    });
    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  return (
    <Section id="features" refs={refs}>
      <SectionHeader
        title="6. AI Feature Suggestions"
        caption="Accept the engineered features to include them in training."
      />
      <div className="mt-5">
        {!hasData ? (
          <EmptyState label="Upload a dataset to see suggestions." />
        ) : !items ? (
          <Skeleton className="h-56 rounded-[10px]" />
        ) : (
          <CardShell>
            <ul className="divide-y">
              {items.map((s: any) => {
                const id = s.id || s.name;
                const suggestionText = s.suggestion || `${s.name} = ${s.formula}`;
                const whyText = s.why || s.reasoning;
                const st = state[id];
                return (
                  <li key={id} className="flex items-center gap-3 p-4">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-primary">
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{whyText}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <code className="min-w-0 flex-1 truncate font-mono-num text-sm text-foreground">
                      {suggestionText}
                    </code>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setState((p) => ({ ...p, [id]: "accepted" }))}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-md border transition-colors",
                          st === "accepted"
                            ? "border-transparent bg-[color:var(--success-soft)] text-[color:var(--success)]"
                            : "hover:bg-secondary text-muted-foreground"
                        )}
                        aria-label="Accept"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setState((p) => ({ ...p, [id]: "rejected" }))}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-md border transition-colors",
                          st === "rejected"
                            ? "border-transparent bg-[color:var(--destructive-soft)] text-destructive"
                            : "hover:bg-secondary text-muted-foreground"
                        )}
                        aria-label="Reject"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardShell>
        )}
      </div>
    </Section>
  );
}

/* ---------------- Target Suggestion ---------------- */
function TargetSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getTargetSuggestion>> | null>(null);

  useEffect(() => {
    if (!hasData || !jobId) {
      setData(null);
      return;
    }
    let cancelled = false;
    api.getTargetSuggestion(jobId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  return (
    <Section id="target" refs={refs}>
      <SectionHeader title="7. AI Target Suggestion" caption="Best candidate target for supervised learning." />
      <div className="mt-5">
        {!hasData ? (
          <EmptyState label="Upload a dataset to suggest a target." />
        ) : !data ? (
          <Skeleton className="h-32 rounded-[10px]" />
        ) : (
          <CardShell className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Suggested target
              </div>
              <code className="rounded-md bg-secondary px-2 py-1 font-mono-num text-sm">
                {data.target_column}
              </code>
              <Pill tone="primary">Confidence · {data.confidence}%</Pill>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{data.reasoning}</p>
          </CardShell>
        )}
      </div>
    </Section>
  );
}

/* ---------------- Problem Type ---------------- */
function ProblemTypeSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.detectProblemType>> | null>(null);

  useEffect(() => {
    if (!hasData || !jobId) {
      setData(null);
      return;
    }
    let cancelled = false;
    api.detectProblemType(jobId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  return (
    <Section id="problem" refs={refs}>
      <SectionHeader title="8. Problem Type Detection" caption="Auto-detected supervised learning task." />
      <div className="mt-5">
        {!hasData ? (
          <EmptyState label="Upload a dataset to detect the problem type." />
        ) : !data ? (
          <Skeleton className="h-28 rounded-[10px]" />
        ) : (
          <CardShell className="p-5">
            <span className="inline-flex items-center rounded-full bg-[color:var(--accent-soft)] px-4 py-1.5 text-base font-semibold text-primary">
              {data.type}
            </span>
            <p className="mt-3 text-sm text-muted-foreground">{data.reasoning}</p>
          </CardShell>
        )}
      </div>
    </Section>
  );
}

/* ---------------- Model Training ---------------- */
const AVAILABLE_MODELS = [
  "Linear Regression",
  "Logistic Regression",
  "Decision Tree",
  "Random Forest",
];

function TrainingSection({ hasData, refs, onTrainSuccess }: { hasData: boolean; refs: RefMap; onTrainSuccess?: () => void }) {
  const { jobId } = useDataset();
  const [target, setTarget] = useState("");
  const [targetOptions, setTargetOptions] = useState<string[]>([]);
  const [testSize, setTestSize] = useState(20);
  const [models, setModels] = useState<string[]>(["Logistic Regression", "Random Forest"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    if (!hasData || !jobId) {
      setTarget("");
      setTargetOptions([]);
      setResults(null);
      return;
    }
    let cancelled = false;
    
    api.getTargetSuggestion(jobId).then((d) => {
      if (!cancelled && d?.target_column) {
        setTarget(d.target_column);
      }
    }).catch(() => {});

    api.getEDA(jobId).then((d) => {
      if (!cancelled && d?.column_info) {
        setTargetOptions(Object.keys(d.column_info));
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hasData, jobId]);

  const toggle = (m: string) =>
    setModels((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const run = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const r = await api.trainModels(jobId, { target, testSize: testSize / 100, models });
      setResults(r);
      toast.success("Training complete");
      if (onTrainSuccess) onTrainSuccess();
    } catch (err: any) {
      toast.error(err.message || "Training failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section id="train" refs={refs}>
      <SectionHeader
        title="9. Model Training"
        caption="Configure and train candidate models on your target."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <CardShell className="p-5">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target column
              </Label>
              <Select value={target} onValueChange={setTarget} disabled={!hasData}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Train / Test split
                </Label>
                <span className="font-mono-num text-sm">
                  {100 - testSize}% / {testSize}%
                </span>
              </div>
              <Slider
                className="mt-3"
                min={10}
                max={40}
                step={5}
                value={[testSize]}
                onValueChange={(v) => setTestSize(v[0])}
                disabled={!hasData}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Models
              </Label>
              <div className="mt-2 space-y-2">
                {AVAILABLE_MODELS.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={models.includes(m)}
                      onCheckedChange={() => toggle(m)}
                      disabled={!hasData}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={run} disabled={!hasData || loading || models.length === 0} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Training..." : "Train Models"}
            </Button>
          </div>
        </CardShell>

        <div className="space-y-4">
          {!hasData ? (
            <EmptyState label="Upload a dataset to enable training." />
          ) : !results ? (
            <EmptyState label="Configure models and click Train Models to see results." />
          ) : (
            <>
              <CardShell className="p-5">
                <h3 className="font-display font-semibold">Model Comparison</h3>
                <DataTable
                  className="mt-3"
                  columns={[
                    { key: "model", label: "Model" },
                    { key: "cvScore", label: "CV Score", numeric: true },
                    { key: "metric", label: "Metric", numeric: true },
                  ]}
                  rows={results.results}
                  rowClassName={(r) =>
                    (r as { isBest: boolean }).isBest
                      ? "bg-[color:var(--accent-soft)] font-semibold text-primary"
                      : undefined
                  }
                />
              </CardShell>

              {(results.problemType === "classification" || results.problem_type === "classification" || results.classificationReport || results.classification_report) && (
                <CardShell className="p-5">
                  <h3 className="font-display font-semibold">Classification Report</h3>
                  <DataTable
                    className="mt-3"
                    columns={[
                      { key: "label", label: "Class" },
                      { key: "precision", label: "Precision", numeric: true },
                      { key: "recall", label: "Recall", numeric: true },
                      { key: "f1", label: "F1", numeric: true },
                      { key: "support", label: "Support", numeric: true },
                    ]}
                    rows={results.classificationReport || results.classification_report || []}
                  />
                </CardShell>
              )}

              <CardShell className="p-5">
                <h3 className="font-display font-semibold">Feature Importance</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer>
                    <BarChart
                      data={results.featureImportance || results.feature_importance || []}
                      layout="vertical"
                      margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" fontSize={12} />
                      <YAxis dataKey="feature" type="category" stroke="#64748B" fontSize={12} width={110} />
                      <RTooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                        cursor={{ fill: "#F1F5F9" }}
                      />
                      <Bar dataKey="importance" fill={TEAL} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardShell>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Predict ---------------- */
interface PredictField {
  key: string;
  label: string;
  type: "number" | "select";
  options?: string[];
  placeholder?: string;
}

function PredictSection({
  hasData,
  refs,
  versionTrigger,
}: {
  hasData: boolean;
  refs: RefMap;
  versionTrigger: number;
}) {
  const { jobId } = useDataset();
  const [modelInfo, setModelInfo] = useState<any | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  useEffect(() => {
    if (!hasData || !jobId) {
      setModelInfo(null);
      setValues({});
      setResult(null);
      return;
    }

    setFetchingInfo(true);
    api.getModelInfo(jobId)
      .then((info) => {
        setModelInfo(info);
        if (info.trained && info.features) {
          const initialValues: Record<string, string> = {};
          info.features.forEach((feat: string) => {
            initialValues[feat] = "";
          });
          setValues(initialValues);
        }
      })
      .catch((err) => {
        console.error("Failed to load model info:", err);
      })
      .finally(() => {
        setFetchingInfo(false);
      });
  }, [hasData, jobId, versionTrigger]);

  const submit = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const r = await api.predict(jobId, values);
      setResult(r);
    } catch (err: any) {
      toast.error(err.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const fields: PredictField[] = useMemo(() => {
    if (!modelInfo || !modelInfo.trained || !modelInfo.features) return [];
    return modelInfo.features.map((feat: string) => {
      const isCategorical = modelInfo.categorical_features?.includes(feat);
      const label = feat
        .split(/[_-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      
      if (isCategorical) {
        return {
          key: feat,
          label,
          type: "select" as const,
          options: modelInfo.category_mappings?.[feat] || [],
        };
      } else {
        return {
          key: feat,
          label,
          type: "number" as const,
          placeholder: "",
        };
      }
    });
  }, [modelInfo]);

  return (
    <Section id="predict" refs={refs}>
      <SectionHeader
        title="10. Predict"
        caption="Enter feature values to score against the trained model."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <CardShell className="p-5">
          {!hasData ? (
            <EmptyState label="Upload a dataset to enable prediction." />
          ) : fetchingInfo ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !modelInfo?.trained ? (
            <EmptyState label="Train models in Section 9 first to make predictions." />
          ) : fields.length === 0 ? (
            <EmptyState label="No feature columns found for the trained model." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </Label>
                    {f.type === "select" ? (
                      <Select
                        value={values[f.key]}
                        onValueChange={(v) => setValues((p) => ({ ...p, [f.key]: v }))}
                        disabled={!hasData}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        placeholder={f.placeholder}
                        className="mt-1.5 font-mono-num"
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                        disabled={!hasData}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button className="mt-5" onClick={submit} disabled={!hasData || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Predict
              </Button>
            </>
          )}
        </CardShell>

        <CardShell className="p-5">
          <h3 className="font-display font-semibold">Prediction</h3>
          {!result ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Fill the form and click Predict to see the model's output.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Predicted value
                </div>
                <div className="mt-1 font-mono-num text-2xl font-semibold text-primary">
                  {result.value}
                </div>
                <Pill tone="primary">Confidence · {(result.confidence * 100).toFixed(0)}%</Pill>
              </div>
              {result.contributions && result.contributions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Feature contributions
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {result.contributions.map((c: any) => {
                      const abs = Math.abs(c.value);
                      const max = Math.max(...result.contributions.map((x: any) => Math.abs(x.value)));
                      const pct = max > 0 ? (abs / max) * 100 : 0;
                      const positive = c.value >= 0;
                      return (
                        <div key={c.feature}>
                          <div className="flex justify-between text-xs">
                            <span className="text-foreground">{c.feature}</span>
                            <span className={cn("font-mono-num", positive ? "text-primary" : "text-destructive")}>
                              {c.value.toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full", positive ? "bg-primary" : "bg-destructive")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardShell>
      </div>
    </Section>
  );
}

/* ---------------- Visualizations ---------------- */
function VisualizationsSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [data, setData] = useState<any | null>(null);
  const [insights, setInsights] = useState<Record<string, string[]>>({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (hasData && jobId) {
      api.getVisualizations(jobId).then(setData);
      setInsightsLoading(true);
      api.getChartInsights(jobId).then((res) => {
        setInsights(res);
        setInsightsLoading(false);
      }).catch(() => {
        setInsights({});
        setInsightsLoading(false);
      });
    } else {
      setInsights({});
    }
  }, [hasData, jobId]);

  const targetCol = data?.target_column;
  const targetType = data?.target_type;

  const tabs = useMemo(() => {
    if (!data) return [];
    if (!targetCol) {
      return [
        { id: "missing", label: "Missing Values" },
        { id: "distribution", label: "Numeric Distributions" },
        { id: "correlation", label: "Correlation Heatmap" },
        { id: "category", label: "Category Distribution" },
      ];
    } else if (targetType === "categorical") {
      return [
        { id: "target_dist", label: "Target Distribution" },
        { id: "category", label: "Top Categories" },
        { id: "top_by_target", label: "Feature vs Target" },
        { id: "correlation", label: "Correlation Heatmap" },
      ];
    } else if (targetType === "numeric") {
      return [
        { id: "target_hist", label: "Target Histogram" },
        { id: "scatter", label: "Scatter Plots" },
        { id: "correlation", label: "Correlation Heatmap" },
        { id: "box_plot", label: "Box Plots" },
      ];
    }
    return [
      { id: "top_by_target", label: "Feature vs Target" },
      { id: "distribution", label: "Numeric Distributions" },
      { id: "correlation", label: "Correlation Heatmap" },
      { id: "category", label: "Category Distribution" },
    ];
  }, [data, targetCol, targetType]);

  const defaultTab = useMemo(() => {
    return tabs[0]?.id || "correlation";
  }, [tabs]);

  return (
    <Section id="viz" refs={refs}>
      <SectionHeader title="11. Visualizations" caption="Distribution, correlation, and category breakdowns." />
      <div className="mt-5">
        {!hasData ? (
          <EmptyState label="Upload a dataset to explore visualizations." />
        ) : !data ? (
          <Skeleton className="h-96 rounded-[10px]" />
        ) : tabs.length === 0 ? (
          <EmptyState label="No visualization data could be extracted for this dataset." />
        ) : (
          <div className="space-y-4">
            <CardShell className="p-5">
              <Tabs key={defaultTab} defaultValue={defaultTab}>
                <TabsList className="flex flex-wrap gap-1">
                  {tabs.map((t) => (
                    <TabsTrigger key={t.id} value={t.id}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="missing" className="mt-4">
                  {(() => {
                    const mv = (data.missingValues ?? []).filter((d: any) => d.percentage > 0);
                    return mv.length === 0 ? (
                      <EmptyState label="Great news — no missing values found in this dataset!" />
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer>
                          <BarChart data={mv.sort((a: any, b: any) => b.percentage - a.percentage)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="column" stroke="#64748B" fontSize={12} />
                            <YAxis stroke="#64748B" fontSize={12} label={{ value: "Missing %", angle: -90, position: "insideLeft" }} />
                            <RTooltip
                              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                              formatter={(v: any) => [`${v}%`, "Missing"]}
                            />
                            <Bar dataKey="percentage" fill="#F87171" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                  <AIInsightPanel insights={insights.missing} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="distribution" className="mt-4">
                  {!data.distribution || data.distribution.length === 0 ? (
                    <EmptyState label="No numeric columns found to show distribution." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={data.distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="bin" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.distribution} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="correlation" className="mt-4">
                  {!data.correlation || data.correlation.length === 0 ? (
                    <EmptyState label="Not enough numeric columns to generate a correlation heatmap." />
                  ) : (
                    <CorrelationHeatmap data={data.correlation} />
                  )}
                  <AIInsightPanel insights={insights.correlation} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="category" className="mt-4">
                  {!data.categoryCount || data.categoryCount.length === 0 ? (
                    <EmptyState label="No categorical columns detected in this dataset." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={data.categoryCount}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.categoryCount.map((_: any, i: number) => (
                              <Cell key={i} fill={i === 0 ? TEAL : TEAL_SOFT} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.category} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="target_dist" className="mt-4">
                  {!data.targetDistribution || data.targetDistribution.length === 0 ? (
                    <EmptyState label="No distribution data found for the target column." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={data.targetDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.target_dist} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="top_by_target" className="mt-4">
                  {!data.topByTarget || data.topByTarget.length === 0 ? (
                    <EmptyState label="No feature importance/target relevance data available." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={data.topByTarget} layout="vertical" margin={{ left: 16, right: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                          <XAxis type="number" stroke="#64748B" fontSize={12} />
                          <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={110} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Bar dataKey="value" fill={TEAL} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.top_by_target} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="target_hist" className="mt-4">
                  {!data.targetHistogram || data.targetHistogram.length === 0 ? (
                    <EmptyState label="No target histogram data available." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <BarChart data={data.targetHistogram}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="bin" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.target_hist} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="scatter" className="mt-4">
                  {!data.scatterPlot || data.scatterPlot.length === 0 ? (
                    <EmptyState label="No scatter plot data available." />
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer>
                        <ScatterChart margin={{ left: 16, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="x" stroke="#64748B" fontSize={12} name={data.scatterXAxis} label={{ value: data.scatterXAxis, position: "bottom", offset: 0 }} />
                          <YAxis dataKey="y" stroke="#64748B" fontSize={12} name={targetCol} label={{ value: targetCol, angle: -90, position: "insideLeft" }} />
                          <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                          <Scatter name="DataPoints" data={data.scatterPlot} fill={TEAL} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.scatter} loading={insightsLoading} />
                </TabsContent>

                <TabsContent value="box_plot" className="mt-4">
                  {!data.boxPlot || data.boxPlot.length === 0 ? (
                    <EmptyState label="Not enough data to construct box plots (groups require at least 4 observations)." />
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart
                          data={data.boxPlot.map((d: any) => ({
                            ...d,
                            iqrBase: d.q25,
                            iqrHeight: parseFloat((d.q75 - d.q25).toFixed(2)),
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="group" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <RTooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                            formatter={(value: any, name: string, props: any) => {
                              if (name === "IQR (Q25–Q75)") {
                                const { q25, q75, q50, min, max } = props.payload;
                                return [
                                  `Min: ${min} | Q25: ${q25} | Median: ${q50} | Q75: ${q75} | Max: ${max}`,
                                  "Box Plot",
                                ];
                              }
                              return null;
                            }}
                          />
                          {/* Transparent base bar to offset from 0 to Q25 */}
                          <Bar dataKey="iqrBase" stackId="box" fill="transparent" legendType="none" />
                          {/* Colored IQR bar from Q25 to Q75 */}
                          <Bar dataKey="iqrHeight" stackId="box" fill={TEAL} radius={[4, 4, 0, 0]} name="IQR (Q25–Q75)" />
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Floating boxes represent the Interquartile Range (IQR) of <strong>{targetCol}</strong> grouped by <strong>{data.boxPlotGroupCol}</strong>. Hover for full stats.
                      </p>
                    </div>
                  )}
                  <AIInsightPanel insights={insights.box_plot} loading={insightsLoading} />
                </TabsContent>
              </Tabs>
            </CardShell>
          </div>
        )}
      </div>
    </Section>
  );
}

function AIInsightPanel({ insights, loading }: { insights?: string[], loading?: boolean }) {
  if (loading) {
    return (
      <div className="mt-4 animate-pulse rounded-lg border bg-card p-4">
        <div className="h-4 w-1/4 rounded bg-muted"></div>
        <div className="mt-3 space-y-2">
          <div className="h-3 rounded bg-muted"></div>
          <div className="h-3 w-5/6 rounded bg-muted"></div>
        </div>
      </div>
    );
  }
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Sparkles className="h-4 w-4" />
        AI Insights
      </div>
      <ul className="mt-3 space-y-2 text-sm text-foreground">
        {insights.map((text, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono-num text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CorrelationHeatmap({ data }: { data: { x: string; y: string; v: number }[] }) {
  const axes = useMemo(() => Array.from(new Set(data.map((d) => d.x))), [data]);
  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `80px repeat(${axes.length}, 60px)` }}
      >
        <div />
        {axes.map((a) => (
          <div key={a} className="text-center text-xs text-muted-foreground">
            {a}
          </div>
        ))}
        {axes.map((y) => (
          <>
            <div key={`l-${y}`} className="pr-2 text-right text-xs text-muted-foreground">
              {y}
            </div>
            {axes.map((x) => {
              const v = data.find((d) => d.x === x && d.y === y)?.v ?? 0;
              const alpha = Math.abs(v);
              const bg = `rgba(15, 118, 110, ${alpha.toFixed(2)})`;
              return (
                <div
                  key={`${x}-${y}`}
                  className="grid h-10 place-items-center rounded font-mono-num text-xs"
                  style={{
                    backgroundColor: bg,
                    color: alpha > 0.5 ? "#fff" : "#0F172A",
                  }}
                >
                  {v.toFixed(2)}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Chat to Chart ---------------- */
function ChatToChartSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<{ title: string; chart_type: string; data: { name: string; value: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChart(null);
    setPrompt("");
    setError(null);
  }, [jobId]);

  const submit = async () => {
    if (!prompt.trim() || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.chatToChart(jobId, prompt);
      setChart(r);
    } catch (e: any) {
      setError(e.message || "Failed to generate chart.");
    }
    setLoading(false);
  };

  const chartType = useMemo(() => {
    if (!chart?.chart_type) return "bar";
    const clean = chart.chart_type.toLowerCase().trim();
    if (clean.includes("bar")) return "bar";
    if (clean.includes("line")) return "line";
    if (clean.includes("pie")) return "pie";
    if (clean.includes("scatter")) return "scatter";
    if (clean.includes("area")) return "area";
    return "bar";
  }, [chart?.chart_type]);

  return (
    <Section id="chatchart" refs={refs}>
      <SectionHeader title="12. Chat to Chart" caption="Generate visualizations from text" />
      <div className="mt-5 space-y-4">
        <CardShell className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g. Average annual income by region"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={!hasData}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button onClick={submit} disabled={!hasData || loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardShell>
        <CardShell className="p-5">
          {loading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : !chart ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              Your chart will appear here.
            </div>
          ) : (
            <div>
              {chart.title && (
                <p className="mb-3 text-sm font-medium text-foreground">{chart.title}</p>
              )}
              <div className="max-h-[500px] overflow-y-auto">
                <div className="h-[500px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "line" ? (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                        <YAxis stroke="#64748B" fontSize={12} domain={[(min: number) => min - Math.abs(min) * 0.1, (max: number) => max + Math.abs(max) * 0.1]} />
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                        <Line type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    ) : chartType === "pie" ? (
                      <PieChart>
                        <Pie
                          data={chart.data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill={TEAL}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chart.data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                      </PieChart>
                    ) : chartType === "scatter" ? (
                      <ScatterChart margin={{ left: 16, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                        <YAxis dataKey="value" stroke="#64748B" fontSize={12} domain={[(min: number) => min - Math.abs(min) * 0.1, (max: number) => max + Math.abs(max) * 0.1]} />
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                        <Scatter name="Data" data={chart.data} fill={TEAL} />
                      </ScatterChart>
                    ) : chartType === "area" ? (
                      <AreaChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                        <YAxis stroke="#64748B" fontSize={12} domain={[(min: number) => min - Math.abs(min) * 0.1, (max: number) => max + Math.abs(max) * 0.1]} />
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                        <Area type="monotone" dataKey="value" stroke={TEAL} fill={TEAL} fillOpacity={0.2} />
                      </AreaChart>
                    ) : (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                        <YAxis stroke="#64748B" fontSize={12} />
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                        <Bar dataKey="value" fill={TEAL} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardShell>
      </div>
    </Section>
  );
}


/* ---------------- Reports ---------------- */
function ReportsSection({ hasData, jobId, refs }: { hasData: boolean; jobId: string; refs: RefMap }) {
  const download = async (kind: "pdf" | "notebook") => {
    await api.downloadReport(jobId, kind);
    toast.success(kind === "pdf" ? "PDF report ready" : "Notebook ready");
  };
  return (
    <Section id="reports" refs={refs}>
      <SectionHeader title="13. Reports" caption="Export the full analysis and modeling run." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <CardShell className="flex items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-display font-semibold">PDF Report</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Executive summary with EDA, insights, and model metrics.
            </p>
          </div>
          <Button variant="outline" onClick={() => download("pdf")} disabled={!hasData} className="gap-1">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </CardShell>
        <CardShell className="flex items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-display font-semibold">Jupyter Notebook</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reproducible .ipynb with every step of the pipeline.
            </p>
          </div>
          <Button variant="outline" onClick={() => download("notebook")} disabled={!hasData} className="gap-1">
            <Download className="h-4 w-4" /> .ipynb
          </Button>
        </CardShell>
      </div>
    </Section>
  );
}

/* ---------------- Export ---------------- */
function ExportSection({ hasData, jobId, refs, versionTrigger }: { hasData: boolean; jobId: string; refs: RefMap; versionTrigger?: number }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<any[] | null>(null);
  useEffect(() => {
    if (hasData && jobId) {
      api.getVersionHistory(jobId).then(setVersions).catch(() => setVersions([]));
    } else {
      setVersions([]);
    }
  }, [hasData, jobId, versionTrigger]);

  return (
    <Section id="export" refs={refs}>
      <SectionHeader title="14. Production Export" caption="Ship your model to production in one click." />
      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CardShell className="flex items-center justify-between gap-3 p-5">
            <div>
              <h3 className="font-display font-semibold">Serialized model</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pickled sklearn pipeline.</p>
            </div>
            <Button
              onClick={async () => {
                await api.exportModel(jobId);
                toast.success("model.pkl ready");
              }}
              disabled={!hasData}
              className="gap-1"
            >
              <Download className="h-4 w-4" /> model.pkl
            </Button>
          </CardShell>
          <CardShell className="flex items-center justify-between gap-3 p-5">
            <div>
              <h3 className="font-display font-semibold">FastAPI server</h3>
              <p className="mt-1 text-sm text-muted-foreground">Auto-generated api_server.py.</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await api.generateApiServer(jobId);
                toast.success("api_server.py generated");
              }}
              disabled={!hasData}
              className="gap-1"
            >
              <FileCode2 className="h-4 w-4" /> api_server.py
            </Button>
          </CardShell>
        </div>

        <CardShell>
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-5 text-left">
              <div>
                <h3 className="font-display font-semibold">How to use this</h3>
                <p className="text-sm text-muted-foreground">Quickstart in 3 steps.</p>
              </div>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t p-5 space-y-4 text-sm">
              <Step n={1} title="Install dependencies">
                <CodeBlock>pip install fastapi uvicorn scikit-learn pandas</CodeBlock>
              </Step>
              <Step n={2} title="Start the API server">
                <CodeBlock>uvicorn api_server:app --host 0.0.0.0 --port 8000</CodeBlock>
              </Step>
              <Step n={3} title="Score a request">
                <CodeBlock>
{`curl -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"age": 42, "annual_income": 68000, "credit_score": 710}'`}
                </CodeBlock>
              </Step>
            </CollapsibleContent>
          </Collapsible>
        </CardShell>

        <CardShell className="p-5">
          <h3 className="font-display font-semibold">Model Version History</h3>
          {!hasData ? (
            <div className="mt-3">
              <EmptyState label="No models trained yet." />
            </div>
          ) : !versions ? (
            <Skeleton className="mt-3 h-40 rounded-lg" />
          ) : (
            <DataTable
              className="mt-3"
              columns={[
                { key: "version", label: "Version" },
                { key: "model", label: "Model" },
                { key: "features", label: "Features", numeric: true },
                { key: "cvScore", label: "CV Score", numeric: true },
                { key: "metric", label: "Metric", numeric: true },
                { key: "timestamp", label: "Timestamp" },
              ]}
              rows={versions}
              rowClassName={(_, i) =>
                i === 0 ? "bg-[color:var(--accent-soft)] font-semibold" : undefined
              }
            />
          )}
        </CardShell>
      </div>
    </Section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary font-mono-num text-xs font-semibold text-primary-foreground">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-secondary p-3 font-mono-num text-xs leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}

/* ---------------- Chat with Data ---------------- */
type ChatMsg = { role: "user" | "assistant"; text: string };
function ChatSection({ hasData, refs }: { hasData: boolean; refs: RefMap }) {
  const { jobId } = useDataset();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (hasData && jobId) {
      setMessages([]);
      let cancelled = false;
      const fetchInitial = async () => {
        setThinking(true);
        try {
          const { answer } = await api.chatWithData(jobId, "dataset summary");
          if (!cancelled) setMessages([{ role: "assistant", text: answer }]);
        } catch (err: any) {
          if (!cancelled) console.error("Initial chat load failed", err);
        } finally {
          if (!cancelled) setThinking(false);
        }
      };
      fetchInitial();
      return () => {
        cancelled = true;
      };
    } else {
      setMessages([]);
    }
  }, [hasData, jobId]);

  const send = async () => {
    if (!input.trim() || !jobId) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    try {
      const { answer } = await api.chatWithData(jobId, q);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${err.message || "Failed to communicate with data chat."}` }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <Section id="chat" refs={refs}>
      <SectionHeader title="15. Chat with Data" caption="Ask anything about your dataset" />
      <div className="mt-5">
        <CardShell className="p-5">
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {messages.length === 0 && !hasData && (
              <EmptyState preset="no-dataset" />
            )}
            {messages.length === 0 && hasData && !thinking && (
              <EmptyState preset="no-chat" description="Ask a question about your dataset below." />
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
                  Thinking<span className="inline-block animate-pulse">...</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about your data..."
              disabled={!hasData}
              className="min-h-[42px] resize-none"
            />
            <Button onClick={send} disabled={!hasData || thinking} className="gap-1">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </CardShell>
      </div>
    </Section>
  );
}

/* ---------------- DataTable ---------------- */
type Col<T> = {
  key: keyof T & string;
  label: string;
  numeric?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  format?: (value: unknown) => string;
};

function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  className,
  rowClassName,
}: {
  columns: Col<T>[];
  rows: T[];
  className?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-md border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-secondary/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                  c.numeric && "text-right"
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={cn(
                "border-b last:border-b-0 transition-colors hover:bg-secondary/40",
                rowClassName?.(r, i)
              )}
            >
              {columns.map((c) => {
                const raw = r[c.key];
                const content = c.render
                  ? c.render(raw, r)
                  : c.format
                  ? c.format(raw)
                  : typeof raw === "number"
                  ? formatNum(raw)
                  : (raw as React.ReactNode);
                return (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-2",
                      c.numeric && "text-right font-mono-num tabular-nums"
                    )}
                  >
                    {content as React.ReactNode}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toFixed(3);
}

// Unused import silencer (kept for tree-shaking clarity)
void RED;

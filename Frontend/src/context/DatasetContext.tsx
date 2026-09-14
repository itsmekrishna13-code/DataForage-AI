import React, { createContext, useContext, useState, useEffect } from "react";

interface DatasetContextType {
  jobId: string | null;
  filename: string | null;
  hasData: boolean;
  setDataset: (jobId: string, filename: string) => void;
  clearDataset: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedJobId = localStorage.getItem("ds_job_id");
    const savedFilename = localStorage.getItem("ds_filename");
    // Guard: discard the old hardcoded "sample_job_id" stub that may be persisted
    // in localStorage from before the fix — it causes 404s on every backend call.
    if (savedJobId && savedJobId !== "sample_job_id" && savedFilename) {
      setJobId(savedJobId);
      setFilename(savedFilename);
    } else if (savedJobId === "sample_job_id") {
      // Clear the stale stub so the UI shows the upload prompt
      localStorage.removeItem("ds_job_id");
      localStorage.removeItem("ds_filename");
    }
  }, []);

  const handleSetDataset = (id: string, name: string) => {
    setJobId(id);
    setFilename(name);
    localStorage.setItem("ds_job_id", id);
    localStorage.setItem("ds_filename", name);
  };

  const handleClearDataset = () => {
    setJobId(null);
    setFilename(null);
    localStorage.removeItem("ds_job_id");
    localStorage.removeItem("ds_filename");
  };

  const hasData = jobId !== null;

  return (
    <DatasetContext.Provider
      value={{
        jobId,
        filename,
        hasData,
        setDataset: handleSetDataset,
        clearDataset: handleClearDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error("useDataset must be used within a DatasetProvider");
  }
  return context;
}

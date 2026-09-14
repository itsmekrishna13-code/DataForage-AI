// Real API layer for the DataForge AI FastAPI backend.
import { API_BASE_URL } from "@/lib/config";
import {
  mockColumnClassification,
  mockDataset,
  mockDescriptiveStats,
  mockEDA,
  mockFeatureImportance,
  mockFeatureSuggestions,
  mockInsights,
  mockMissingValues,
  mockOverview,
  mockPrediction,
  mockProblemType,
  mockTargetSuggestion,
  mockTopByTarget,
  mockTrainingResults,
  mockVersionHistory,
  mockVisualizations,
} from "@/lib/mockData";

export type UploadResult = {
  job_id: string;
  message: string;
};

export const api = {
  // uploadDataset(file) -> POST / (multipart/form-data) — returns { job_id, message }
  async uploadDataset(file: File): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`uploadDataset failed: ${err.message || err}`);
    }
  },

  // loadSampleDataset() -> fetch the bundled sample CSV and POST it to the backend just like a real upload.
  // This ensures a real job_id is returned instead of the old hardcoded "sample_job_id" string.
  async loadSampleDataset(): Promise<UploadResult> {
    try {
      // Fetch the sample CSV bundled in /public/
      const csvRes = await fetch("/sample_dataset.csv");
      if (!csvRes.ok)
        throw new Error(
          `Could not fetch sample CSV (${csvRes.status}). Make sure public/sample_dataset.csv exists.`
        );
      const blob = await csvRes.blob();
      const file = new File([blob], "sample_dataset.csv", { type: "text/csv" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`loadSampleDataset failed: ${err.message || err}`);
    }
  },

  // getEDA(jobId) -> GET /eda/{job_id}
  async getEDA(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/eda/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getEDA failed: ${err.message || err}`);
    }
  },

  // getColumnClassification(jobId) -> GET /ml/columns/classify/{job_id}
  async getColumnClassification(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/columns/classify/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getColumnClassification failed: ${err.message || err}`);
    }
  },

  // getInsights(jobId) -> GET /ml/insights/{job_id}
  async getInsights(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/insights/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.insights || [];
    } catch (err: any) {
      throw new Error(`getInsights failed: ${err.message || err}`);
    }
  },

  // getFeatureSuggestions(jobId) -> GET /feature-engineering/{job_id}
  async getFeatureSuggestions(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/feature-engineering/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getFeatureSuggestions failed: ${err.message || err}`);
    }
  },

  // applyFeatures(jobId, features) -> POST /feature-engineering/{job_id}
  async applyFeatures(jobId: string, features: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/feature-engineering/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`applyFeatures failed: ${err.message || err}`);
    }
  },

  // getTargetSuggestion(jobId) -> GET /ml/target/suggest/{job_id}
  async getTargetSuggestion(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/target/suggest/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getTargetSuggestion failed: ${err.message || err}`);
    }
  },

  // detectProblemType(jobId) -> GET /ml/problem-type/{job_id}?target_column=...
  async detectProblemType(jobId: string) {
    try {
      const targetSuggestion = await this.getTargetSuggestion(jobId);
      const targetColumn = targetSuggestion.target_column;

      const res = await fetch(`${API_BASE_URL}/ml/problem-type/${jobId}?target_column=${encodeURIComponent(targetColumn)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`detectProblemType failed: ${err.message || err}`);
    }
  },

  // trainModels(jobId, config) -> POST /ml/train/{job_id}
  // Payload schema (TrainRequest):
  //   target_column : str   — column to predict
  //   test_size     : float — fraction for test split (e.g. 0.2 = 20 %)
  //   models        : str[] — display-name model list (e.g. "Logistic Regression")
  //   problem_type  : omitted — backend auto-detects from data
  async trainModels(jobId: string, config: {
    target: string;
    testSize: number;  // fraction [0,1] — caller passes testSize/100 already
    models: string[];
  }) {
    try {
      const payload = {
        target_column: config.target,
        test_size: config.testSize,   // e.g. 0.20 for 80/20 split
        models: config.models,        // ["Logistic Regression", "Random Forest"]
        // problem_type omitted → backend auto-detects
      };
      const res = await fetch(`${API_BASE_URL}/ml/train/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${detail?.detail ?? res.statusText}`);
      }
      return await res.json();
    } catch (err: any) {
      throw new Error(`trainModels failed: ${err.message || err}`);
    }
  },

  // predict(jobId, input) -> POST /ml/predict/{job_id}
  async predict(jobId: string, input: Record<string, string | number>) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/predict/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`predict failed: ${err.message || err}`);
    }
  },

  // getDataQuality(jobId) -> GET /data-quality/{job_id}
  async getDataQuality(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/data-quality/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getDataQuality failed: ${err.message || err}`);
    }
  },

  // getOutliers(jobId) -> GET /outliers/{job_id}
  async getOutliers(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/outliers/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getOutliers failed: ${err.message || err}`);
    }
  },

  // removeOutliers(jobId) -> POST /outliers/{job_id}
  async removeOutliers(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/outliers/${jobId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`removeOutliers failed: ${err.message || err}`);
    }
  },

  // getShapGlobal(jobId) -> GET /shap/global/{job_id}
  async getShapGlobal(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/shap/global/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getShapGlobal failed: ${err.message || err}`);
    }
  },

  // getShapPredict(jobId, input) -> POST /shap/predict/{job_id}
  async getShapPredict(jobId: string, input: Record<string, string | number>) {
    try {
      const res = await fetch(`${API_BASE_URL}/shap/predict/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getShapPredict failed: ${err.message || err}`);
    }
  },

  // chatWithData(jobId, message) -> POST /chat/{job_id}
  async chatWithData(jobId: string, message: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: message }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`chatWithData failed: ${err.message || err}`);
    }
  },

  // downloadReport(jobId, kind) -> GET /report/{job_id} or GET /notebook/{job_id}
  // Fetches the binary response and triggers a real browser file download.
  async downloadReport(jobId: string, kind: "pdf" | "notebook") {
    try {
      const path = kind === "pdf" ? `report/${jobId}` : `notebook/${jobId}`;
      const filename = kind === "pdf"
        ? `dataset_analysis_report_${jobId}.pdf`
        : `DataForge_AI_Analysis_${jobId}.ipynb`;
      const res = await fetch(`${API_BASE_URL}/${path}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${detail?.detail ?? res.statusText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(`downloadReport failed: ${err.message || err}`);
    }
  },

  // exportModel(jobId) -> GET /export/model/{job_id}
  // Fetches the .pkl binary and triggers a real browser file download.
  async exportModel(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/export/model/${jobId}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${detail?.detail ?? res.statusText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "model.pkl";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(`exportModel failed: ${err.message || err}`);
    }
  },

  // generateApiServer(jobId) -> GET /export/code/{job_id}
  // Fetches the Python script and triggers a real browser file download.
  async generateApiServer(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/export/code/${jobId}`);
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${detail?.detail ?? res.statusText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "api_server.py";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(`generateApiServer failed: ${err.message || err}`);
    }
  },

  // getVisualizations(jobId) -> GET /eda/visualizations/{job_id}
  async getVisualizations(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/eda/visualizations/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getVisualizations failed: ${err.message || err}`);
    }
  },

  // getChartInsights(jobId) -> GET /eda/insights/{job_id}
  // Returns { [tabId: string]: string[] } — AI insight bullets per chart tab.
  async getChartInsights(jobId: string): Promise<Record<string, string[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/eda/insights/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.insights ?? {};
    } catch {
      return {};
    }
  },

  // chatToChart(jobId, prompt) -> POST /ml/chat-to-chart/{job_id}
  async chatToChart(jobId: string, prompt: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/chat-to-chart/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`chatToChart failed: ${err.message || err}`);
    }
  },

  async getVersionHistory(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/history/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getVersionHistory failed: ${err.message || err}`);
    }
  },

  async getModelInfo(jobId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/ml/model-info/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      throw new Error(`getModelInfo failed: ${err.message || err}`);
    }
  },
};

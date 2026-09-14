export const mockDataset = {
  filename: "customers_sample.csv",
  sizeBytes: 384_512,
  rows: 4820,
  cols: 14,
};

export const mockOverview = {
  totalRows: 4820,
  totalCols: 14,
  missingPct: 3.2,
  duplicates: 27,
};

export const mockMissingValues = [
  { column: "annual_income", missing: 84, pct: 1.74 },
  { column: "credit_score", missing: 42, pct: 0.87 },
  { column: "employment_years", missing: 18, pct: 0.37 },
  { column: "region", missing: 9, pct: 0.19 },
];

export const mockEDA = [
  { name: "customer_id", dtype: "int64", unique: 4820 },
  { name: "age", dtype: "int64", unique: 62 },
  { name: "gender", dtype: "object", unique: 3 },
  { name: "annual_income", dtype: "float64", unique: 3921 },
  { name: "credit_score", dtype: "float64", unique: 412 },
  { name: "employment_years", dtype: "float64", unique: 41 },
  { name: "region", dtype: "object", unique: 6 },
  { name: "product", dtype: "object", unique: 4 },
  { name: "signup_year", dtype: "int64", unique: 8 },
  { name: "notes", dtype: "object", unique: 4801 },
  { name: "churned", dtype: "int64", unique: 2 },
];

export const mockDescriptiveStats = [
  { column: "age", mean: 42.3, std: 12.1, min: 18, q25: 32, q50: 42, q75: 53, max: 78 },
  { column: "annual_income", mean: 68420, std: 24310, min: 12000, q25: 48000, q50: 65000, q75: 88000, max: 240000 },
  { column: "credit_score", mean: 704, std: 62, min: 480, q25: 662, q50: 710, q75: 748, max: 830 },
  { column: "employment_years", mean: 8.6, std: 6.4, min: 0, q25: 3, q50: 7, q75: 13, max: 40 },
];

export const mockColumnClassification = {
  numeric: ["age", "annual_income", "credit_score", "employment_years"],
  categorical: ["gender", "region", "product", "churned"],
  text: ["notes"],
  date: ["signup_year"],
};

export const mockInsights = [
  "The dataset contains 4,820 customer records with 14 columns and low missingness (3.2%).",
  "annual_income and credit_score show a strong positive correlation (r ≈ 0.71).",
  "The churned target is imbalanced: 18% positive class vs 82% negative — consider stratified sampling.",
  "Customers in the 'West' region have a 27% higher average income than the baseline.",
  "The notes column is high-cardinality free text (99.6% unique) and is best used as a text feature or dropped.",
];

export const mockFeatureSuggestions = [
  { id: "f1", suggestion: "income_per_year_employed = annual_income / (employment_years + 1)", why: "Captures earnings velocity, often predictive of churn." },
  { id: "f2", suggestion: "credit_bucket = binned credit_score (poor/fair/good/excellent)", why: "Non-linear effects of credit_score become linear after binning." },
  { id: "f3", suggestion: "tenure_years = current_year - signup_year", why: "Directly measures customer lifetime." },
  { id: "f4", suggestion: "is_high_value = annual_income > 100000", why: "Threshold effect observed near $100k income." },
  { id: "f5", suggestion: "notes_length = length of notes column", why: "Longer notes correlate with support-heavy accounts." },
];

export const mockTargetSuggestion = {
  target: "churned",
  confidence: 92,
  reasoning:
    "Binary column with clear class balance and strong signal across numeric predictors. High mutual information with credit_score and tenure.",
};

export const mockProblemType = {
  type: "Classification" as const,
  reasoning:
    "Target 'churned' has 2 unique integer values (0/1) with a stable class distribution — a binary classification problem.",
};

export const mockTrainingResults = [
  { model: "Logistic Regression", cvScore: 0.812, metric: 0.804, isBest: false },
  { model: "Decision Tree", cvScore: 0.798, metric: 0.791, isBest: false },
  { model: "Random Forest", cvScore: 0.874, metric: 0.869, isBest: true },
  { model: "Linear Regression", cvScore: 0.0, metric: 0.0, isBest: false },
];

export const mockClassificationReport = [
  { label: "0 (retained)", precision: 0.91, recall: 0.94, f1: 0.92, support: 3952 },
  { label: "1 (churned)", precision: 0.78, recall: 0.69, f1: 0.73, support: 868 },
  { label: "macro avg", precision: 0.85, recall: 0.82, f1: 0.83, support: 4820 },
  { label: "weighted avg", precision: 0.89, recall: 0.89, f1: 0.89, support: 4820 },
];

export const mockFeatureImportance = [
  { feature: "credit_score", importance: 0.28 },
  { feature: "annual_income", importance: 0.21 },
  { feature: "tenure_years", importance: 0.16 },
  { feature: "employment_years", importance: 0.12 },
  { feature: "age", importance: 0.09 },
  { feature: "region", importance: 0.07 },
  { feature: "product", importance: 0.04 },
  { feature: "gender", importance: 0.03 },
];

export const mockPrediction = {
  value: "0 (retained)",
  confidence: 0.87,
  contributions: [
    { feature: "credit_score", value: 0.34 },
    { feature: "tenure_years", value: 0.22 },
    { feature: "annual_income", value: 0.11 },
    { feature: "age", value: -0.08 },
    { feature: "employment_years", value: -0.14 },
  ],
};

export const mockTopByTarget = [
  { name: "West", value: 0.31 },
  { name: "Northeast", value: 0.24 },
  { name: "South", value: 0.19 },
  { name: "Midwest", value: 0.14 },
  { name: "Mountain", value: 0.08 },
  { name: "Other", value: 0.04 },
];

export const mockVisualizations = {
  distribution: [
    { bin: "18-25", count: 320 },
    { bin: "26-35", count: 940 },
    { bin: "36-45", count: 1420 },
    { bin: "46-55", count: 1180 },
    { bin: "56-65", count: 640 },
    { bin: "66+", count: 320 },
  ],
  correlation: [
    { x: "age", y: "age", v: 1 },
    { x: "age", y: "income", v: 0.42 },
    { x: "age", y: "credit", v: 0.31 },
    { x: "age", y: "tenure", v: 0.58 },
    { x: "income", y: "age", v: 0.42 },
    { x: "income", y: "income", v: 1 },
    { x: "income", y: "credit", v: 0.71 },
    { x: "income", y: "tenure", v: 0.36 },
    { x: "credit", y: "age", v: 0.31 },
    { x: "credit", y: "income", v: 0.71 },
    { x: "credit", y: "credit", v: 1 },
    { x: "credit", y: "tenure", v: 0.28 },
    { x: "tenure", y: "age", v: 0.58 },
    { x: "tenure", y: "income", v: 0.36 },
    { x: "tenure", y: "credit", v: 0.28 },
    { x: "tenure", y: "tenure", v: 1 },
  ],
  categoryCount: [
    { name: "Basic", count: 1820 },
    { name: "Plus", count: 1420 },
    { name: "Pro", count: 980 },
    { name: "Enterprise", count: 600 },
  ],
};

export const mockVersionHistory = [
  { version: "v4", model: "Random Forest", features: 12, cvScore: 0.874, metric: 0.869, timestamp: "2026-07-13 09:41" },
  { version: "v3", model: "Random Forest", features: 10, cvScore: 0.861, metric: 0.855, timestamp: "2026-07-12 17:22" },
  { version: "v2", model: "Logistic Regression", features: 10, cvScore: 0.812, metric: 0.804, timestamp: "2026-07-12 11:08" },
  { version: "v1", model: "Decision Tree", features: 8, cvScore: 0.744, metric: 0.731, timestamp: "2026-07-11 15:30" },
];

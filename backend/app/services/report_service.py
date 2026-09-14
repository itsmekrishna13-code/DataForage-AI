import io
import pandas as pd
from fpdf import FPDF
import nbformat
from nbformat.v4 import new_notebook, new_markdown_cell, new_code_cell
from app.core.session_store import store
from app.services.ml_service import get_column_classification

def generate_pdf_report(job_id: str) -> io.BytesIO:
    session = store.get_session(job_id)
    if not session:
        raise ValueError(f"No active session found for job_id: {job_id}")
    
    df = session.get("df")
    artifacts = session.get("ml_artifacts")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)

    # Title
    pdf.set_font("Helvetica", style="B", size=18)
    pdf.cell(0, 10, "Dataset Analysis Report", ln=True, align="C")
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 10, "Generated automatically by DataForge AI", ln=True, align="C")
    pdf.ln(10)

    # Section 1: Overview
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "1. General Dataset Overview", ln=True)
    pdf.set_font("Helvetica", size=11)
    if df is not None:
        pdf.cell(0, 6, f"- Total Rows: {df.shape[0]}", ln=True)
        pdf.cell(0, 6, f"- Total Columns: {df.shape[1]}", ln=True)
        cols_str = ", ".join(list(df.columns))
        if len(cols_str) > 80:
            cols_str = cols_str[:77] + "..."
        pdf.cell(0, 6, f"- Columns List: {cols_str}", ln=True)
        pdf.cell(0, 6, f"- Duplicate Rows Count: {df.duplicated().sum()}", ln=True)
    pdf.ln(5)

    # Section 2: Missing Values
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "2. Missing Values Summary", ln=True)
    pdf.set_font("Helvetica", size=11)
    if df is not None:
        missing = df.isnull().sum()
        missing = missing[missing > 0]
        if len(missing) > 0:
            for col, val in missing.items():
                pdf.cell(0, 6, f"- {col}: {val} missing", ln=True)
        else:
            pdf.cell(0, 6, "No missing values found in the dataset.", ln=True)
    pdf.ln(5)

    # Section 3: ML Performance
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "3. Machine Learning Model Performance", ln=True)
    pdf.set_font("Helvetica", size=11)

    if artifacts:
        problem_type = artifacts.get("problem_type", "Unknown")
        model_name = artifacts.get("model_name", "Unknown")
        selected_target = artifacts.get("target_column", "Unknown")
        features = artifacts.get("features", [])
        
        pdf.cell(0, 6, f"- Model Type: {model_name}", ln=True)
        pdf.cell(0, 6, f"- Target Variable: {selected_target}", ln=True)
        pdf.cell(0, 6, f"- Features Used: {', '.join(features)}", ln=True)
        
        pdf.cell(0, 6, "- Metrics: (Check API /ml/train response for precise metrics)", ln=True)
        pdf.ln(5)
        
        # Feature Importance
        model = artifacts.get("model")
        if hasattr(model, "feature_importances_") and hasattr(model, "feature_names_in_"):
            pdf.set_font("Helvetica", style="B", size=12)
            pdf.cell(0, 10, "Feature Importance:", ln=True)
            pdf.set_font("Courier", size=10)
            
            importances = model.feature_importances_
            feature_names = model.feature_names_in_
            feat_imp = pd.Series(importances, index=feature_names).sort_values(ascending=False).head(10)
            
            for feat, imp in feat_imp.items():
                pdf.cell(0, 5, f"{feat}: {imp:.4f}", ln=True)
    else:
        pdf.cell(0, 6, "No ML model has been trained yet.", ln=True)

    pdf_bytes = pdf.output()
    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode('latin1')
    return io.BytesIO(bytes(pdf_bytes))


def generate_jupyter_notebook(job_id: str) -> io.BytesIO:
    session = store.get_session(job_id)
    if not session:
        raise ValueError(f"No active session found for job_id: {job_id}")
        
    df = session.get("df")
    file_name = session.get("filename", "dataset.csv")
    artifacts = session.get("ml_artifacts", {})
    problem_type = artifacts.get("problem_type", "regression")
    target_col = artifacts.get("target_column")
    features = artifacts.get("features", [])
    
    nb = new_notebook()
    
    # 1. Markdown Title
    nb.cells.append(new_markdown_cell(f"# DataForge AI — Auto-Generated Analysis Notebook\n\nThis notebook was auto-generated from the dataset **{file_name}**."))
    
    # 2. Code - Imports
    if problem_type == "classification":
        model_imports = "from sklearn.linear_model import LogisticRegression\\nfrom sklearn.tree import DecisionTreeClassifier\\nfrom sklearn.ensemble import RandomForestClassifier"
        metric_imports = "from sklearn.metrics import accuracy_score, classification_report"
    else:
        model_imports = "from sklearn.linear_model import LinearRegression\\nfrom sklearn.tree import DecisionTreeRegressor\\nfrom sklearn.ensemble import RandomForestRegressor"
        metric_imports = "from sklearn.metrics import mean_absolute_error, r2_score"
    
    imports_code = f"""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as plt_sns
from sklearn.model_selection import train_test_split
{model_imports}
{metric_imports}"""
    nb.cells.append(new_code_cell(imports_code))
    
    # 3. Load Data
    nb.cells.append(new_markdown_cell(f"**Note:** Ensure that `{file_name}` is placed in the same directory as this notebook."))
    load_code = f"""df = pd.read_csv('{file_name}')
df.head()"""
    nb.cells.append(new_code_cell(load_code))
    
    # 4. EDA
    nb.cells.append(new_markdown_cell("## Exploratory Data Analysis"))
    eda_code = """print(f'Dataset Shape: {{df.shape}}')
print('\\nMissing Values:')
print(df.isnull().sum())
print(f'\\nDuplicate Rows: {{df.duplicated().sum()}}')
df.describe()"""
    nb.cells.append(new_code_cell(eda_code))
    
    # 5. AI Insights
    insights_text = "No AI insights were generated during this session (API)."
    nb.cells.append(new_markdown_cell(f"## AI-generated insights from the analysis session\n\n{insights_text}"))
    
    # 6. Visualizations
    nb.cells.append(new_markdown_cell("## Visualizations"))
    
    cc = get_column_classification(df) if df is not None else {"numeric": [], "categorical": [], "datetime": [], "text": []}
    numeric_cols = cc.get('numeric', [])
    cat_cols = cc.get('categorical', [])
    
    if not target_col and numeric_cols:
        target_col = numeric_cols[-1]
        
    if target_col in numeric_cols:
        nb.cells.append(new_markdown_cell(f"### Distribution of {target_col}"))
        hist_code = f"""plt.figure(figsize=(8, 5))
plt_sns.histplot(df['{target_col}'].dropna(), kde=True)
plt.title('Distribution of {target_col}')
plt.show()"""
        nb.cells.append(new_code_cell(hist_code))
    
    if len(numeric_cols) > 1:
        nb.cells.append(new_markdown_cell("### Correlation Heatmap"))
        heatmap_code = f"""plt.figure(figsize=(10, 8))
corr = df[{numeric_cols}].corr()
plt_sns.heatmap(corr, annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Correlation Heatmap')
plt.show()"""
        nb.cells.append(new_code_cell(heatmap_code))
        
    if cat_cols:
        top_cat = cat_cols[0]
        nb.cells.append(new_markdown_cell(f"### Value Counts for {top_cat}"))
        bar_code = f"""plt.figure(figsize=(8, 5))
df['{top_cat}'].value_counts().head(10).plot(kind='bar')
plt.title('Top 10 Value Counts for {top_cat}')
plt.xticks(rotation=45)
plt.show()"""
        nb.cells.append(new_code_cell(bar_code))
        
        if target_col in numeric_cols:
            nb.cells.append(new_markdown_cell(f"### Boxplot of {target_col} by {top_cat}"))
            box_code = f"""plt.figure(figsize=(10, 6))
plt_sns.boxplot(x='{top_cat}', y='{target_col}', data=df)
plt.title('{target_col} grouped by {top_cat}')
plt.xticks(rotation=45)
plt.show()"""
            nb.cells.append(new_code_cell(box_code))
            
    if len(numeric_cols) >= 2 and target_col in numeric_cols:
        nb.cells.append(new_markdown_cell("### Scatter Plot of Most Correlated Features"))
        nb.cells.append(new_code_cell(f"""# Find highly correlated features with target
corr_with_target = df[{numeric_cols}].corr()['{target_col}'].drop('{target_col}')
if not corr_with_target.empty:
    top_feature = corr_with_target.abs().idxmax()
    plt.figure(figsize=(8, 5))
    plt_sns.scatterplot(x=top_feature, y='{target_col}', data=df)
    plt.title(f'Scatter Plot: {{top_feature}} vs {target_col}')
    plt.show()"""))

    # 7 & 8. Model Training & Metrics
    if features and target_col:
        nb.cells.append(new_markdown_cell("## Machine Learning Model Training & Comparison\\n\\nTraining three models (Linear/Logistic Regression, Decision Tree, Random Forest) to compare performance."))
        
        if problem_type == "classification":
            models_init = """models = {
    'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
    'Decision Tree': DecisionTreeClassifier(random_state=42),
    'Random Forest': RandomForestClassifier(random_state=42)
}"""
            metrics_eval = """results = []
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    results.append({'Model': name, 'Accuracy': acc})

results_df = pd.DataFrame(results).set_index('Model')
print("Model Comparison:")
print(results_df)

print("\\nDetailed Classification Report (Random Forest):")
rf_pred = models['Random Forest'].predict(X_test)
print(classification_report(y_test, rf_pred))"""
        else:
            models_init = """models = {
    'Linear Regression': LinearRegression(),
    'Decision Tree': DecisionTreeRegressor(random_state=42),
    'Random Forest': RandomForestRegressor(random_state=42)
}"""
            metrics_eval = """results = []
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    results.append({'Model': name, 'R² Score': r2, 'MAE': mae})

results_df = pd.DataFrame(results).set_index('Model')
print("Model Comparison:")
print(results_df)"""
            
        ml_code = f"""# Drop rows with missing target or features
features = {features}
target = '{target_col}'
model_df = df.dropna(subset=features + [target])

X = model_df[features]
# One-hot encode categorical features if any
X = pd.get_dummies(X, drop_first=True)
y = model_df[target]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

{models_init}

{metrics_eval}

# Feature Importances (Random Forest)
rf_model = models['Random Forest']
importances = rf_model.feature_importances_
feat_imp = pd.Series(importances, index=X.columns).sort_values(ascending=False)
plt.figure(figsize=(8, 5))
feat_imp.head(10).plot(kind='bar')
plt.title('Top 10 Feature Importances (Random Forest)')
plt.show()"""
        nb.cells.append(new_code_cell(ml_code))

    nb_content = nbformat.writes(nb)
    return io.BytesIO(nb_content.encode('utf-8'))

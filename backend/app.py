from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
import pysqlite3
from typing import List, Optional

app = FastAPI(
    title="GRC Risk Assessment API",
    description="Simple risk assessment backend for interview assignment",
    version="1.0.0"
)

# ────────────────────────────────────────────────
# Database Setup
# ────────────────────────────────────────────────

DB_FILE = "risks.db"

def init_db():
    conn = pysqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS risks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset TEXT NOT NULL,
            threat TEXT NOT NULL,
            likelihood INTEGER NOT NULL,
            impact INTEGER NOT NULL,
            score INTEGER NOT NULL,
            level TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# Run initialization once when app starts
init_db()

# ────────────────────────────────────────────────
# Pydantic Models
# ────────────────────────────────────────────────

class RiskCreate(BaseModel):
    asset: str = Field(..., min_length=1, description="Asset name e.g. 'Web Server'")
    threat: str = Field(..., min_length=1, description="Threat description e.g. 'SQL Injection'")
    likelihood: int = Field(..., ge=1, le=5, description="Likelihood 1-5")
    impact: int = Field(..., ge=1, le=5, description="Impact 1-5")

class Risk(RiskCreate):
    id: int
    score: int
    level: str

    class Config:
        from_attributes = True  # allows mapping from dict/row

# ────────────────────────────────────────────────
# Helper Functions
# ────────────────────────────────────────────────

def calculate_risk_level(score: int) -> str:
    if 1 <= score <= 5:
        return "Low"
    elif 6 <= score <= 12:
        return "Medium"
    elif 13 <= score <= 18:
        return "High"
    elif 19 <= score <= 25:
        return "Critical"
    else:
        return "Unknown"  # safety net, shouldn't happen

# ────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────

@app.post("/assess-risk", response_model=Risk, status_code=201)
def assess_risk(risk: RiskCreate):
    score = risk.likelihood * risk.impact
    level = calculate_risk_level(score)

    conn = pysqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO risks (asset, threat, likelihood, impact, score, level)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (risk.asset, risk.threat, risk.likelihood, risk.impact, score, level)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "asset": risk.asset,
        "threat": risk.threat,
        "likelihood": risk.likelihood,
        "impact": risk.impact,
        "score": score,
        "level": level
    }

@app.get("/risks", response_model=List[Risk])
def get_risks(level: Optional[str] = Query(None, description="Filter by level (Low, Medium, High, Critical)")):
    conn = pysqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    if level:
        # Case-sensitive as per spec
        cursor.execute("SELECT * FROM risks WHERE level = ? ORDER BY id DESC", (level,))
    else:
        cursor.execute("SELECT * FROM risks ORDER BY id DESC")

    rows = cursor.fetchall()
    conn.close()

    risks = []
    for row in rows:
        risks.append({
            "id": row[0],
            "asset": row[1],
            "threat": row[2],
            "likelihood": row[3],
            "impact": row[4],
            "score": row[5],
            "level": row[6]
        })

    return risks

@app.get("/")
def root():
    return {"message": "GRC Risk Assessment API is running. Visit /docs for Swagger UI"}
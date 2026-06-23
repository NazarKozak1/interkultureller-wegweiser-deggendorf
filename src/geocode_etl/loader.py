from pathlib import Path
from src.utils.logger import get_logger
import pandas as pd
from typing import Dict, List
import json

ROOT_FOLDER = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_FOLDER / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Loader:
    def __init__(self):
        self.logger = get_logger("Loader")
        self.data: Dict[str, List[dict]] = {}

    def add_data(self, name: str, df: pd.DataFrame):
        if df.empty:
            self.logger.warning(f"Empty DataFrame for {name}")
            return

        if name not in self.data:
            self.data[name] = []

        records = df.where(df.notna(), other=None).to_dict(orient="records")

        import math
        cleaned = [
            {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in row.items()}
            for row in records
        ]

        self.data[name].extend(cleaned)
        self.logger.info(f"Successfully added {name} data")


    def save_data(self, path: str = None):
        if path is None:
            path = DATA_DIR / "processed.json"

        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

        self.logger.info(f"Data saved to {path}")


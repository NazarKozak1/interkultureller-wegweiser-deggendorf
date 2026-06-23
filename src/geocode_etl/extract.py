import pandas as pd
from src.utils.logger import get_logger
from typing import Generator, Tuple

# CONFIG
TABLE_URLS = {
    "Behörden": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=0&single=true&output=csv",

    "Schulen und Hochschulen": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=933066968&single=true&output=csv",

    "Integrationskurse Deggendorf": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=1496433718&single=true&output=csv",

    "Gesundheit": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=1220247134&single=true&output=csv",

    "Soziales": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=1409247791&single=true&output=csv",

    "Vereine und Gemeinschaft": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zd32BpDICqtiwP26-tyi_sdO_Cn1ONidnDScaiMtghE9GaicRISGw9-o788Igp9QnQYusjTmTE2b/pub?gid=1131528659&single=true&output=csv",
}


class TableExtractor:
    def __init__(self):
        self.table_urls = TABLE_URLS
        self.logger = get_logger("Extractor")


    def extract(self) -> Generator[Tuple[str, pd.DataFrame], None, None]:
        for spreadsheet_name, spreadsheet_url  in self.table_urls.items():
            try:
                table_df = pd.read_csv(spreadsheet_url)
                yield spreadsheet_name, table_df

            except Exception as e:
                self.logger.error(e)
                continue


if __name__ == "__main__":
    extractor = TableExtractor()
    for name, df in extractor.extract():
        print(df)
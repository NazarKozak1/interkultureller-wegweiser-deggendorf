from src.geocode_etl.extract import TableExtractor
from src.geocode_etl.transform import TableTransformer
from src.geocode_etl.loader import Loader
from src.utils.logger import get_logger

logger = get_logger("main")

def main():
    extractor = TableExtractor()
    transformer = TableTransformer()
    loader = Loader()

    for spreadsheet_name, data_df in extractor.extract():
        logger.info(f"Processing {spreadsheet_name}")

        transformed_data = transformer.transform(data_df)
        loader.add_data(spreadsheet_name, transformed_data)

    loader.save_data()


if __name__ == "__main__":
    main()
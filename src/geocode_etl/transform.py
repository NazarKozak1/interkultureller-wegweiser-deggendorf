from src.utils.logger import get_logger
from typing import Tuple, Optional
import pandas as pd
from geopy.geocoders import Nominatim
import time

# approx ranges for Deggendorf
LAT_RANGE = [48.804140, 48.874381]
LON_RANGE = [12.924455, 13.017748]

class TableTransformer:
    def __init__(self):
        self.logger = get_logger("Transformer")
        self.geolocator = Nominatim(user_agent="my_app")

    def _check_range(self, lat: float, lon: float) -> bool:
        if lat is None or lon is None:
            return False

        return LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]

    def _geocode(self, address: str) -> Tuple[Optional[float], Optional[float]]:
        retries = 3
        for attempt in range(retries):
            try:
                location = self.geolocator.geocode(address)
                if location is None:
                    return None, None

                return location.latitude, location.longitude

            except Exception as e:
                self.logger.warning(f"Geocode attempt {attempt + 1}/{retries} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(3)
            finally:
                time.sleep(1.5)

        self.logger.error(f"All {retries} attempts failed for: {address}")
        return None, None


    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if "Name" in df.columns:
            data_cleaned = df.dropna(subset=["Name"])
        else:
            self.logger.error("Column 'Name' not found")
            return pd.DataFrame()

        if data_cleaned.empty:
            self.logger.error(f"Empty dataframe was given")
            return pd.DataFrame()

        final_df = []
        for idx, row in data_cleaned.iterrows():
             try:
                address = row["Adresse"]
                lat, lon = self._geocode(address)

                # if lan and lat not in the city then trying more accurate location
                if not self._check_range(lat, lon):
                    self.logger.warning(f"Trying to use more accurate address")
                    more_accurate_address = row["Adresse"] + " 94469, Deggendorf, Germany"
                    lat, lon = self._geocode(more_accurate_address)

                if not self._check_range(lat, lon):
                    self.logger.warning(f"Couldn't find address {address} in Deggendorf")
                    continue

                row["lat"] = lat
                row["lon"] = lon
                final_df.append(row)

             except KeyError:
                self.logger.error(f"Couldn't find 'Adresse' column")
                continue
             except Exception as e:
                 self.logger.error(f"Error during processing row {idx}: {e}")
                 continue

        if not final_df:
            self.logger.error(f"Couldn't geocode data")
            return pd.DataFrame()

        return pd.DataFrame(final_df)
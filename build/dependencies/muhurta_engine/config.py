"""Static configuration for V03 raw-only export."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LocationConfig:
    """Geographic configuration for astronomical calculations."""

    name: str
    latitude: float
    longitude: float
    timezone: str
    altitude_m: float = 14.0


MUMBAI = LocationConfig(
    name="Mumbai, India",
    latitude=19.0760,
    longitude=72.8777,
    timezone="Asia/Kolkata",
    altitude_m=14.0,
)

DEFAULT_LOCATION = MUMBAI
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DEFAULT_RAW_JSON_PATH = DATA_DIR / "muhurta_raw_week.json"
V03_STATUS_PATH = DATA_DIR / "v03_refresh_status.json"

WEEKDAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

WEEKDAY_RULERS = {
    0: "Moon",
    1: "Mars",
    2: "Mercury",
    3: "Jupiter",
    4: "Venus",
    5: "Saturn",
    6: "Sun",
}

HORA_SEQUENCE = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]

DAY_CHOGHADIYA = {
    0: ["Amrit", "Kala", "Shubha", "Roga", "Udveg", "Chara", "Labh", "Amrit"],
    1: ["Roga", "Udveg", "Chara", "Labh", "Amrit", "Kala", "Shubha", "Roga"],
    2: ["Labh", "Amrit", "Kala", "Shubha", "Roga", "Udveg", "Chara", "Labh"],
    3: ["Shubha", "Roga", "Udveg", "Chara", "Labh", "Amrit", "Kala", "Shubha"],
    4: ["Chara", "Labh", "Amrit", "Kala", "Shubha", "Roga", "Udveg", "Chara"],
    5: ["Kala", "Shubha", "Roga", "Udveg", "Chara", "Labh", "Amrit", "Kala"],
    6: ["Udveg", "Chara", "Labh", "Amrit", "Kala", "Shubha", "Roga", "Udveg"],
}

NIGHT_CHOGHADIYA = {
    0: ["Chara", "Roga", "Kala", "Labh", "Udveg", "Shubha", "Amrit", "Chara"],
    1: ["Labh", "Udveg", "Shubha", "Amrit", "Chara", "Roga", "Kala", "Labh"],
    2: ["Udveg", "Shubha", "Amrit", "Chara", "Roga", "Kala", "Labh", "Udveg"],
    3: ["Shubha", "Amrit", "Chara", "Roga", "Kala", "Labh", "Udveg", "Shubha"],
    4: ["Amrit", "Chara", "Roga", "Kala", "Labh", "Udveg", "Shubha", "Amrit"],
    5: ["Roga", "Kala", "Labh", "Udveg", "Shubha", "Amrit", "Chara", "Roga"],
    6: ["Shubha", "Amrit", "Chara", "Roga", "Kala", "Labh", "Udveg", "Shubha"],
}

RAHU_KAAL_SLOTS = {0: 2, 1: 7, 2: 5, 3: 6, 4: 4, 5: 3, 6: 8}
YAMAGANDA_SLOTS = {0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6}

SIGN_NAMES = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

NAKSHATRA_NAMES = [
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigashira",
    "Ardra",
    "Punarvasu",
    "Pushya",
    "Ashlesha",
    "Magha",
    "Purva Phalguni",
    "Uttara Phalguni",
    "Hasta",
    "Chitra",
    "Swati",
    "Vishakha",
    "Anuradha",
    "Jyeshtha",
    "Moola",
    "Purva Ashadha",
    "Uttara Ashadha",
    "Shravana",
    "Dhanishta",
    "Shatabhisha",
    "Purva Bhadrapada",
    "Uttara Bhadrapada",
    "Revati",
]

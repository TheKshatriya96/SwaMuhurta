"""Swiss Ephemeris raw astronomy helpers for V03."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Dict
from zoneinfo import ZoneInfo

import swisseph as swe

from .config import LocationConfig, NAKSHATRA_NAMES, SIGN_NAMES


def normalize_degrees(value: float) -> float:
    """Normalize any angular value to 0-360 degrees."""

    return value % 360.0


def local_datetime_to_jd(moment: datetime) -> float:
    """Convert a timezone-aware local datetime to Julian day in UT."""

    utc_moment = moment.astimezone(timezone.utc)
    fractional_hour = (
        utc_moment.hour
        + (utc_moment.minute / 60.0)
        + (utc_moment.second / 3600.0)
        + (utc_moment.microsecond / 3_600_000_000.0)
    )
    return swe.julday(utc_moment.year, utc_moment.month, utc_moment.day, fractional_hour)


def jd_to_local_datetime(julian_day: float, tz_name: str) -> datetime:
    """Convert a Julian day in UT to a localized datetime."""

    year, month, day, hour = swe.revjul(julian_day)
    hour_int = int(hour)
    minute_float = (hour - hour_int) * 60
    minute_int = int(minute_float)
    second_float = (minute_float - minute_int) * 60
    second_int = int(second_float)
    microsecond = int(round((second_float - second_int) * 1_000_000))
    if microsecond == 1_000_000:
        second_int += 1
        microsecond = 0
    utc_dt = datetime(
        year,
        month,
        day,
        hour_int,
        minute_int,
        second_int,
        microsecond,
        tzinfo=timezone.utc,
    )
    return utc_dt.astimezone(ZoneInfo(tz_name))


class SwissEphemerisEngine:
    """Astronomical helper built on pyswisseph."""

    PLANETS = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mars": swe.MARS,
        "Mercury": swe.MERCURY,
        "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS,
        "Saturn": swe.SATURN,
        "Rahu": swe.TRUE_NODE,
    }

    def __init__(self, location: LocationConfig):
        self.location = location
        self.tz = ZoneInfo(location.timezone)
        swe.set_sid_mode(swe.SIDM_LAHIRI)

    def _planet_positions(self, julian_day: float, flags: int) -> Dict[str, Dict[str, object]]:
        """Compute planetary longitudes and speeds for the configured set."""

        planets: Dict[str, Dict[str, object]] = {}
        for name, body in self.PLANETS.items():
            xx, _ = swe.calc_ut(julian_day, body, flags)
            longitude = normalize_degrees(xx[0])
            speed = xx[3]
            planets[name] = {
                "longitude": round(longitude, 6),
                "speed_longitude": round(speed, 6),
                "retrograde": bool(speed < 0),
            }

        rahu_longitude = float(planets["Rahu"]["longitude"])
        rahu_speed = float(planets["Rahu"]["speed_longitude"])
        planets["Ketu"] = {
            "longitude": round(normalize_degrees(rahu_longitude + 180.0), 6),
            "speed_longitude": round(rahu_speed, 6),
            "retrograde": bool(rahu_speed < 0),
        }
        return planets

    def _event_time(self, local_day: date, body: int, event_flag: int) -> datetime:
        local_midnight = datetime.combine(local_day, time.min, tzinfo=self.tz)
        event_start_jd = local_datetime_to_jd(local_midnight)
        result, event_times = swe.rise_trans(
            event_start_jd,
            body,
            event_flag,
            (
                self.location.longitude,
                self.location.latitude,
                self.location.altitude_m,
            ),
        )
        if result != 0:
            raise RuntimeError(f"Swiss Ephemeris could not compute event flag {event_flag}")
        return jd_to_local_datetime(event_times[0], self.location.timezone)

    def sunrise_sunset(self, local_day: date) -> Dict[str, datetime]:
        """Compute sunrise, sunset, next sunrise, and solar noon."""

        sunrise = self._event_time(local_day, swe.SUN, swe.CALC_RISE)
        sunset = self._event_time(local_day, swe.SUN, swe.CALC_SET)
        next_day = date.fromordinal(local_day.toordinal() + 1)
        next_sunrise = self._event_time(next_day, swe.SUN, swe.CALC_RISE)
        solar_noon = sunrise + ((sunset - sunrise) / 2)
        return {
            "sunrise": sunrise,
            "sunset": sunset,
            "next_sunrise": next_sunrise,
            "solar_noon": solar_noon,
        }

    def planetary_snapshot(self, moment: datetime) -> Dict[str, object]:
        """Compute sidereal planetary longitudes only."""

        flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL
        julian_day = local_datetime_to_jd(moment.astimezone(self.tz))
        return {
            "timestamp": moment.isoformat(),
            "planets": self._planet_positions(julian_day, flags),
        }

    def panchang_snapshot(self, moment: datetime) -> Dict[str, object]:
        """Compute raw paksha, nakshatra, and lagna values at a moment."""

        flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL
        julian_day = local_datetime_to_jd(moment.astimezone(self.tz))
        planets = self._planet_positions(julian_day, flags)

        sun_longitude = float(planets["Sun"]["longitude"])
        moon_longitude = float(planets["Moon"]["longitude"])
        moon_phase_diff = normalize_degrees(moon_longitude - sun_longitude)
        paksha = "Shukla Paksha" if moon_phase_diff < 180.0 else "Krishna Paksha"

        nakshatra_span = 360.0 / len(NAKSHATRA_NAMES)
        nakshatra_index = min(int(moon_longitude / nakshatra_span), len(NAKSHATRA_NAMES) - 1)
        nakshatra = NAKSHATRA_NAMES[nakshatra_index]

        _, ascmc = swe.houses_ex(
            julian_day,
            self.location.latitude,
            self.location.longitude,
            b"P",
            swe.FLG_SIDEREAL,
        )
        ascendant_longitude = normalize_degrees(ascmc[0])
        lagna = SIGN_NAMES[int(ascendant_longitude // 30)]

        return {
            "timestamp": moment.isoformat(),
            "paksha": paksha,
            "nakshatra": nakshatra,
            "lagna": lagna,
            "ascendant_longitude": round(ascendant_longitude, 6),
        }

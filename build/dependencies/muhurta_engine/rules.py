"""Traditional raw interval calculations for V03."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple

from .config import (
    DAY_CHOGHADIYA,
    HORA_SEQUENCE,
    NIGHT_CHOGHADIYA,
    RAHU_KAAL_SLOTS,
    WEEKDAY_RULERS,
    YAMAGANDA_SLOTS,
)


def split_interval(start: datetime, end: datetime, parts: int) -> List[Tuple[datetime, datetime]]:
    """Split an interval into equal-sized sub-intervals."""

    span = (end - start) / parts
    intervals: List[Tuple[datetime, datetime]] = []
    cursor = start
    for index in range(parts):
        next_cursor = end if index == parts - 1 else start + (span * (index + 1))
        intervals.append((cursor, next_cursor))
        cursor = next_cursor
    return intervals


def build_horas(local_day: date, sunrise: datetime, sunset: datetime, next_sunrise: datetime) -> List[Dict[str, object]]:
    """Build raw day and night hora windows."""

    weekday = local_day.weekday()
    start_ruler = WEEKDAY_RULERS[weekday]
    start_index = HORA_SEQUENCE.index(start_ruler)
    day_intervals = split_interval(sunrise, sunset, 12)
    night_intervals = split_interval(sunset, next_sunrise, 12)
    horas: List[Dict[str, object]] = []

    for idx, (start, end) in enumerate(day_intervals):
        horas.append({
            "phase": "day",
            "index": idx + 1,
            "ruler": HORA_SEQUENCE[(start_index + idx) % len(HORA_SEQUENCE)],
            "start": start,
            "end": end,
        })

    for idx, (start, end) in enumerate(night_intervals):
        horas.append({
            "phase": "night",
            "index": idx + 1,
            "ruler": HORA_SEQUENCE[(start_index + 12 + idx) % len(HORA_SEQUENCE)],
            "start": start,
            "end": end,
        })
    return horas


def build_choghadiya(local_day: date, sunrise: datetime, sunset: datetime, next_sunrise: datetime) -> List[Dict[str, object]]:
    """Build day and night choghadiya windows."""

    weekday = local_day.weekday()
    day_types = DAY_CHOGHADIYA[weekday]
    night_types = NIGHT_CHOGHADIYA[weekday]
    day_intervals = split_interval(sunrise, sunset, 8)
    night_intervals = split_interval(sunset, next_sunrise, 8)
    segments: List[Dict[str, object]] = []

    for idx, (start, end) in enumerate(day_intervals):
        segments.append({
            "phase": "day",
            "index": idx + 1,
            "type": day_types[idx],
            "start": start,
            "end": end,
        })
    for idx, (start, end) in enumerate(night_intervals):
        segments.append({
            "phase": "night",
            "index": idx + 1,
            "type": night_types[idx],
            "start": start,
            "end": end,
        })
    return segments


def build_rahu_yamaganda(local_day: date, sunrise: datetime, sunset: datetime) -> Dict[str, Dict[str, datetime]]:
    """Compute Rahu Kaal and Yamaganda as daytime octants."""

    octants = split_interval(sunrise, sunset, 8)
    weekday = local_day.weekday()
    rahu_start, rahu_end = octants[RAHU_KAAL_SLOTS[weekday] - 1]
    yama_start, yama_end = octants[YAMAGANDA_SLOTS[weekday] - 1]
    return {
        "rahu_kaal": {"start": rahu_start, "end": rahu_end},
        "yamaganda": {"start": yama_start, "end": yama_end},
    }


def build_abhijit(solar_noon: datetime) -> Dict[str, datetime]:
    """Abhijit Muhurat centered on solar noon, +/- 24 minutes."""

    delta = timedelta(minutes=24)
    return {"start": solar_noon - delta, "end": solar_noon + delta}

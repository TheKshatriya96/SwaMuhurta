"""Create the standalone V07 rules database without touching generated muhurta data."""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR.parent
BUILD_RULES_DB = ROOT_DIR / "data" / "rules.db"
PUBLIC_RULES_DB = PROJECT_DIR / "web" / "public" / "data" / "rules.db"


def leaf(field: str, op: str, value: Any) -> dict[str, Any]:
    return {"field": field, "op": op, "value": value}


def any_of(*conditions: dict[str, Any]) -> dict[str, Any]:
    return {"any": list(conditions)}


def all_of(*conditions: dict[str, Any]) -> dict[str, Any]:
    return {"all": list(conditions)}


def category_rows() -> list[tuple[Any, ...]]:
    return [
        ("avoid", "Avoid", "Av", "#ef4444", "dashed", 0, 80, 0, "Avoid / Bad Kaal", "Blocked by active risk filters; keep work routine and reversible.", "Routine work, planning, review, rest, non-critical tasks.", "Avoid new starts, investments, commitments, sensitive messages, travel, purchases, confrontation.", 1),
        ("golden", "Golden", "Gd", "#facc15", "solid", 1, 75, 1, "Golden Muhurat", "Multiple strong supports align with low risk, making this a high-quality window.", "Prayer, sankalp, important start, major positive commitment, long-term initiative.", "Avoid wasting the window on trivial actions or impulsive decisions.", 1),
        ("auspicious", "Auspicious", "Ap", "#34d399", "solid", 2, 50, 1, "Auspicious Muhurat", "General support is positive and no major obstruction dominates the window.", "Start useful work, contact people, begin learning, make constructive decisions.", "Avoid reckless risk, emotional confrontation, or poorly prepared commitments.", 1),
        ("leadership", "Leadership", "Ld", "#60a5fa", "dotted", 3, 50, 1, "Leadership / Authority", "Authority, communication, visibility, or career-facing indicators are strongest now.", "Pitch idea, present roadmap, ask approval, send progress update, take initiative.", "Avoid ego-driven message, emotional confrontation, impulsive resignation, power struggle.", 1),
        ("wealth", "Wealth", "Wt", "#22c55e", "dotted", 4, 50, 1, "Wealth / Gain", "Wealth, gain, value, or money-related indicators are strongest now.", "Review investments, plan purchase, discuss income, ask payment, make business proposal.", "Avoid blind speculation, emotional spending, leverage, gambling-style trades.", 1),
        ("relationship", "Relationship", "Rl", "#f472b6", "solid", 5, 50, 1, "Relationship / Social", "Relationship, harmony, partnership, or social indicators are strongest now.", "Approach respectfully, send family message, start soft conversation, socialize.", "Avoid pressure, emotional ultimatum, confrontation, forced commitment.", 1),
        ("learning", "Learning", "Lr", "#a78bfa", "solid", 6, 50, 1, "Learning / Wisdom", "Study, research, judgment, or wisdom-oriented indicators are strongest now.", "Study, research, compare options, document, write, analyze, start course.", "Avoid distracted study, rushed conclusions, shallow research.", 1),
        ("execution", "Execution", "Ex", "#fb923c", "solid", 7, 50, 1, "Execution / Problem Solving", "Execution, service, logic, or problem-solving indicators are strongest now.", "Code, debug, run automation, validate data, fix report, handle operational work.", "Avoid reckless deployment, unnecessary confrontation, emotional decision.", 1),
        ("travel", "Travel", "Tr", "#22d3ee", "solid", 8, 50, 1, "Travel / Movement", "Movement, travel, visits, or transition-oriented indicators are strongest now.", "Leave home, start journey, visit someone, commute, attend meeting.", "Avoid risky travel, angry departure, unnecessary rush.", 1),
        ("purchase", "Purchase", "Pr", "#eab308", "dotted", 9, 50, 1, "Purchase / Acquisition", "Acquisition, tools, assets, or practical purchase indicators are strongest now.", "Buy gadgets, tools, courses, software, subscriptions, equipment, useful upgrades.", "Avoid impulse buying, luxury-only spending, unresearched purchase.", 1),
        ("neutral", "Neutral", "Nt", "#94a3b8", "solid", 10, 0, 0, "Neutral / Routine", "No single strong state dominates this window.", "Daily work, admin, maintenance, light planning, routine tasks.", "Avoid major irreversible decisions unless necessary.", 1),
    ]


def rule_rows() -> list[tuple[Any, ...]]:
    rows: list[tuple[Any, ...]] = []

    def add(category: str, rule_id: str, label: str, points: int, condition: dict[str, Any], description: str = "") -> None:
        rows.append((rule_id, category, label, points, 1, json.dumps(condition, separators=(",", ":")), description, len(rows) + 1))

    yes = ["Y", "Yes"]
    for field, label in [
        ("rahuKaal", "Rahu Kaal active"),
        ("yamaganda", "Yamaganda active"),
        ("gulika", "Gulika active"),
        ("durmuhurta", "Durmuhurta active"),
        ("varjyam", "Varjyam active"),
        ("tithiKshaya", "Tithi Kshaya active"),
        ("nakshatraKshaya", "Nakshatra Kshaya active"),
    ]:
        add("avoid", f"avoid_{field}", label, 100, leaf(field, "in", yes))
    add("avoid", "avoid_bad_choghadiya", "Kaal, Roga or Udveg Choghadiya", 100, leaf("choghadiya", "contains_any", ["Kala", "Kaal", "Rog", "Udveg"]))
    add("avoid", "avoid_harsh_weak_moon", "Harsh Yoga with weak Moon", 80, all_of(leaf("isHarshYoga", "equals", True), leaf("isWeakMoonRisk", "equals", True)))

    good_hora = ["Jupiter", "Venus", "Mercury", "Moon"]
    strong_dignity = ["Exalted", "Own", "Mooltrikona"]
    good_chandra = [1, 3, 6, 7, 10, 11]
    add("golden", "golden_amrit", "Amrit Choghadiya", 20, leaf("choghadiya", "contains_any", ["Amrit"]))
    add("golden", "golden_labh", "Labh Choghadiya", 15, leaf("choghadiya", "contains_any", ["Labh"]))
    add("golden", "golden_shubh", "Shubh Choghadiya", 10, leaf("choghadiya", "contains_any", ["Shubh", "Shubha"]))
    add("golden", "golden_hora", "Benefic Hora", 10, leaf("hora", "contains_any", good_hora))
    add("golden", "golden_moon_house", "Moon in supportive house", 10, leaf("moonHouse", "in", [1, 5, 9, 10, 11]))
    add("golden", "golden_tara", "Mitra or Parama Mitra Tara", 10, leaf("taraName", "in", ["Mitra", "Parama Mitra"]))
    add("golden", "golden_chandra", "Supportive Chandrabalam", 10, leaf("chandrabalamSignDistance", "in", good_chandra))
    add("golden", "golden_jupiter", "Strong Jupiter dignity", 10, leaf("jupiterDignity", "in", strong_dignity))
    add("golden", "golden_venus", "Strong Venus dignity", 10, leaf("venusDignity", "in", strong_dignity))
    add("golden", "golden_lagna_degree", "Lagna away from sign boundary", 10, leaf("lagnaDeg", "between", [5, 25]))
    add("golden", "golden_harsh_yoga", "Harsh Yoga penalty", -20, leaf("isHarshYoga", "equals", True))
    add("golden", "golden_weak_moon", "Weak Moon penalty", -15, leaf("isWeakMoonRisk", "equals", True))

    add("auspicious", "auspicious_choghadiya", "Positive Choghadiya", 15, leaf("choghadiya", "contains_any", ["Amrit", "Labh", "Shubh", "Shubha"]))
    add("auspicious", "auspicious_hora", "Benefic Hora", 10, leaf("hora", "contains_any", good_hora))
    add("auspicious", "auspicious_moon_house", "Moon in supportive house", 10, leaf("moonHouse", "in", [1, 3, 5, 7, 9, 10, 11]))
    add("auspicious", "auspicious_tara", "Supportive Tara", 10, leaf("taraName", "in", ["Sampat", "Kshema", "Sadhana", "Mitra", "Parama Mitra"]))
    add("auspicious", "auspicious_chandra", "Supportive Chandrabalam", 10, leaf("chandrabalamSignDistance", "in", good_chandra))
    add("auspicious", "auspicious_lagna_degree", "Lagna away from sign boundary", 5, leaf("lagnaDeg", "between", [5, 25]))
    add("auspicious", "auspicious_clean_yoga", "Yoga is not harsh", 5, leaf("isHarshYoga", "equals", False))
    add("auspicious", "auspicious_harsh_yoga", "Harsh Yoga penalty", -15, leaf("isHarshYoga", "equals", True))
    add("auspicious", "auspicious_weak_moon", "Weak Moon penalty", -10, leaf("isWeakMoonRisk", "equals", True))

    add("leadership", "leadership_sun_house", "Sun in 1st, 10th or 11th", 20, leaf("sunHouse", "in", [1, 10, 11]))
    add("leadership", "leadership_jupiter_house", "Jupiter in 9th, 10th or 11th", 15, leaf("jupiterHouse", "in", [9, 10, 11]))
    add("leadership", "leadership_mercury_house", "Mercury in 3rd, 10th or 11th", 15, leaf("mercuryHouse", "in", [3, 10, 11]))
    add("leadership", "leadership_house10_lord", "Supportive 10th-house lord", 10, leaf("house10Lord", "in", ["Sun", "Mars", "Jupiter", "Mercury"]))
    add("leadership", "leadership_hora", "Leadership Hora", 10, leaf("hora", "contains_any", ["Sun", "Jupiter", "Mercury", "Mars"]))
    add("leadership", "leadership_choghadiya", "Labh or Shubh Choghadiya", 10, leaf("choghadiya", "contains_any", ["Labh", "Shubh", "Shubha"]))
    add("leadership", "leadership_sun_dignity", "Strong Sun dignity", 10, leaf("sunDignity", "in", strong_dignity))
    add("leadership", "leadership_lagna_degree", "Lagna away from sign boundary", 5, leaf("lagnaDeg", "between", [5, 25]))
    add("leadership", "leadership_harsh_yoga", "Harsh Yoga penalty", -15, leaf("isHarshYoga", "equals", True))
    add("leadership", "leadership_moon_risk", "Moon in 8th or 12th penalty", -10, leaf("moonHouse", "in", [8, 12]))

    add("wealth", "wealth_venus_house", "Venus in 2nd or 11th", 20, leaf("venusHouse", "in", [2, 11]))
    add("wealth", "wealth_jupiter_house", "Jupiter in 2nd or 11th", 20, leaf("jupiterHouse", "in", [2, 11]))
    add("wealth", "wealth_mercury_house", "Mercury in 2nd, 10th or 11th", 15, leaf("mercuryHouse", "in", [2, 10, 11]))
    add("wealth", "wealth_rahu_house", "Rahu in 11th", 15, leaf("rahuHouse", "equals", 11))
    add("wealth", "wealth_labh", "Labh Choghadiya", 15, leaf("choghadiya", "contains_any", ["Labh"]))
    add("wealth", "wealth_hora", "Wealth-supportive Hora", 10, leaf("hora", "contains_any", ["Venus", "Jupiter", "Mercury"]))
    add("wealth", "wealth_house2_lord", "Supportive 2nd-house lord", 10, leaf("house2Lord", "in", ["Venus", "Jupiter", "Mercury"]))
    add("wealth", "wealth_house11_lord", "Supportive 11th-house lord", 10, leaf("house11Lord", "in", ["Venus", "Jupiter", "Mercury", "Saturn"]))
    add("wealth", "wealth_jupiter_dignity", "Strong Jupiter dignity", 10, leaf("jupiterDignity", "in", strong_dignity))
    add("wealth", "wealth_venus_dignity", "Strong Venus dignity", 10, leaf("venusDignity", "in", strong_dignity))
    add("wealth", "wealth_harsh_yoga", "Harsh Yoga penalty", -15, leaf("isHarshYoga", "equals", True))
    add("wealth", "wealth_moon_risk", "Moon in 8th or 12th penalty", -15, leaf("moonHouse", "in", [8, 12]))

    add("relationship", "relationship_venus_house", "Venus in relationship house", 20, leaf("venusHouse", "in", [1, 2, 5, 7, 11]))
    add("relationship", "relationship_jupiter_house", "Jupiter in supportive house", 15, leaf("jupiterHouse", "in", [2, 5, 7, 9, 11]))
    add("relationship", "relationship_moon_house", "Moon in receptive house", 15, leaf("moonHouse", "in", [1, 2, 5, 7, 9, 11]))
    add("relationship", "relationship_house7_lord", "Supportive 7th-house lord", 10, leaf("house7Lord", "in", ["Venus", "Jupiter", "Moon", "Mercury"]))
    add("relationship", "relationship_hora", "Relationship Hora", 10, leaf("hora", "contains_any", ["Venus", "Jupiter", "Moon"]))
    add("relationship", "relationship_choghadiya", "Shubh or Amrit Choghadiya", 10, leaf("choghadiya", "contains_any", ["Shubh", "Shubha", "Amrit"]))
    add("relationship", "relationship_tara", "Mitra or Parama Mitra Tara", 10, leaf("taraName", "in", ["Mitra", "Parama Mitra"]))
    add("relationship", "relationship_chandra", "Supportive Chandrabalam", 10, leaf("chandrabalamSignDistance", "in", good_chandra))
    add("relationship", "relationship_venus_dignity", "Strong Venus dignity", 10, leaf("venusDignity", "in", strong_dignity))
    add("relationship", "relationship_harsh_yoga", "Harsh Yoga penalty", -20, leaf("isHarshYoga", "equals", True))
    add("relationship", "relationship_moon_risk", "Moon in 6th, 8th or 12th penalty", -20, leaf("moonHouse", "in", [6, 8, 12]))
    add("relationship", "relationship_ketu", "Ketu in 5th or 7th penalty", -10, leaf("ketuHouse", "in", [5, 7]))
    add("relationship", "relationship_mars", "Mars in 7th penalty", -10, leaf("marsHouse", "equals", 7))

    add("learning", "learning_mercury_house", "Mercury in learning house", 20, leaf("mercuryHouse", "in", [1, 3, 5, 9, 10, 11]))
    add("learning", "learning_jupiter_house", "Jupiter in learning house", 20, leaf("jupiterHouse", "in", [1, 4, 5, 9, 10, 11]))
    add("learning", "learning_house5_lord", "Learning-supportive 5th lord", 10, leaf("house5Lord", "in", ["Mercury", "Jupiter"]))
    add("learning", "learning_house9_lord", "Learning-supportive 9th lord", 10, leaf("house9Lord", "in", ["Mercury", "Jupiter"]))
    add("learning", "learning_hora", "Mercury or Jupiter Hora", 10, leaf("hora", "contains_any", ["Mercury", "Jupiter"]))
    add("learning", "learning_choghadiya", "Positive Choghadiya", 10, leaf("choghadiya", "contains_any", ["Labh", "Shubh", "Shubha", "Amrit"]))
    add("learning", "learning_nakshatra", "Learning-friendly Nakshatra", 10, leaf("moonNakshatra", "in", ["Pushya", "Revati", "Hasta", "Rohini", "Ashwini", "Punarvasu", "Uttara Phalguni"]))
    add("learning", "learning_tara", "Sadhana, Mitra or Parama Mitra Tara", 10, leaf("taraName", "in", ["Sadhana", "Mitra", "Parama Mitra"]))
    add("learning", "learning_harsh_yoga", "Harsh Yoga penalty", -10, leaf("isHarshYoga", "equals", True))
    add("learning", "learning_moon_risk", "Moon in 8th or 12th penalty", -10, leaf("moonHouse", "in", [8, 12]))

    add("execution", "execution_mercury_house", "Mercury in execution house", 20, leaf("mercuryHouse", "in", [3, 6, 10, 11]))
    add("execution", "execution_mars_house", "Mars in execution house", 15, leaf("marsHouse", "in", [3, 6, 10, 11]))
    add("execution", "execution_saturn_house", "Saturn in execution house", 15, leaf("saturnHouse", "in", [3, 6, 10, 11]))
    add("execution", "execution_moon_house", "Moon in 6th", 15, leaf("moonHouse", "equals", 6))
    add("execution", "execution_house6_lord", "Execution-supportive 6th lord", 10, leaf("house6Lord", "in", ["Mars", "Mercury", "Saturn"]))
    add("execution", "execution_house10_lord", "Execution-supportive 10th lord", 10, leaf("house10Lord", "in", ["Mars", "Mercury", "Saturn"]))
    add("execution", "execution_hora", "Execution Hora", 10, leaf("hora", "contains_any", ["Mercury", "Mars", "Saturn"]))
    add("execution", "execution_choghadiya", "Execution-supportive Choghadiya", 10, leaf("choghadiya", "contains_any", ["Chara", "Labh", "Shubh", "Shubha"]))
    add("execution", "execution_harsh_yoga", "Harsh Yoga penalty", -10, leaf("isHarshYoga", "equals", True))
    add("execution", "execution_moon_risk", "Moon in 8th or 12th penalty", -10, leaf("moonHouse", "in", [8, 12]))

    add("travel", "travel_chara", "Chara Choghadiya", 20, leaf("choghadiya", "contains_any", ["Chara"]))
    add("travel", "travel_mars_house", "Mars in 3rd or 9th", 15, leaf("marsHouse", "in", [3, 9]))
    add("travel", "travel_mercury_house", "Mercury in 3rd or 9th", 15, leaf("mercuryHouse", "in", [3, 9]))
    add("travel", "travel_moon_house", "Moon in movement house", 10, leaf("moonHouse", "in", [3, 7, 9, 11]))
    add("travel", "travel_house3_lord", "Movement-supportive 3rd lord", 10, leaf("house3Lord", "in", ["Mars", "Mercury", "Moon", "Jupiter"]))
    add("travel", "travel_house9_lord", "Movement-supportive 9th lord", 10, leaf("house9Lord", "in", ["Mars", "Mercury", "Moon", "Jupiter"]))
    add("travel", "travel_hora", "Travel Hora", 10, leaf("hora", "contains_any", ["Mercury", "Moon", "Mars"]))
    add("travel", "travel_nakshatra", "Travel-friendly Nakshatra", 10, leaf("moonNakshatra", "in", ["Ashwini", "Pushya", "Hasta", "Anuradha", "Revati", "Uttara Ashadha"]))
    add("travel", "travel_moon_risk", "Moon in 8th or 12th penalty", -20, leaf("moonHouse", "in", [8, 12]))
    add("travel", "travel_harsh_yoga", "Harsh Yoga penalty", -15, leaf("isHarshYoga", "equals", True))

    add("purchase", "purchase_venus_house", "Venus in acquisition house", 20, leaf("venusHouse", "in", [2, 4, 11]))
    add("purchase", "purchase_mercury_house", "Mercury in acquisition house", 15, leaf("mercuryHouse", "in", [2, 3, 10, 11]))
    add("purchase", "purchase_jupiter_house", "Jupiter in acquisition house", 15, leaf("jupiterHouse", "in", [2, 9, 11]))
    add("purchase", "purchase_choghadiya", "Positive Choghadiya", 15, leaf("choghadiya", "contains_any", ["Labh", "Shubh", "Shubha", "Amrit"]))
    add("purchase", "purchase_hora", "Acquisition Hora", 10, leaf("hora", "contains_any", ["Venus", "Mercury", "Jupiter"]))
    add("purchase", "purchase_house2_lord", "Supportive 2nd-house lord", 10, leaf("house2Lord", "in", ["Venus", "Mercury", "Jupiter"]))
    add("purchase", "purchase_house4_lord", "Supportive 4th-house lord", 10, leaf("house4Lord", "in", ["Venus", "Mercury", "Jupiter", "Moon"]))
    add("purchase", "purchase_house11_lord", "Supportive 11th-house lord", 10, leaf("house11Lord", "in", ["Venus", "Mercury", "Jupiter", "Saturn"]))
    add("purchase", "purchase_venus_dignity", "Strong Venus dignity", 10, leaf("venusDignity", "in", strong_dignity))
    add("purchase", "purchase_mercury_dignity", "Strong Mercury dignity", 10, leaf("mercuryDignity", "in", strong_dignity))
    add("purchase", "purchase_moon_risk", "Moon in 8th or 12th penalty", -15, leaf("moonHouse", "in", [8, 12]))
    add("purchase", "purchase_harsh_yoga", "Harsh Yoga penalty", -15, leaf("isHarshYoga", "equals", True))
    return rows


def create_database(path: Path, force: bool = False) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"Rules database already exists and was not overwritten: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()

    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            PRAGMA journal_mode=DELETE;
            CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, description TEXT NOT NULL DEFAULT '');
            CREATE TABLE categories (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                short_code TEXT NOT NULL,
                color TEXT NOT NULL,
                line_style TEXT NOT NULL,
                priority INTEGER NOT NULL,
                primary_threshold INTEGER NOT NULL,
                is_positive INTEGER NOT NULL,
                primary_state TEXT NOT NULL,
                reason_text TEXT NOT NULL,
                best_actions TEXT NOT NULL,
                avoid_actions TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE rules (
                id TEXT PRIMARY KEY,
                category_id TEXT NOT NULL REFERENCES categories(id),
                label TEXT NOT NULL,
                points INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                conditions_json TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL
            );
            CREATE INDEX idx_rules_category ON rules(category_id, sort_order);
            """
        )
        metadata = {
            "schema_version": "1",
            "engine": "V07 browser SQLite rule engine",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        connection.executemany("INSERT INTO metadata (key, value) VALUES (?, ?)", metadata.items())
        settings = [
            ("avoid_override_score", "80", "Avoid score that forces Avoid / Bad Kaal."),
            ("golden_primary_score", "75", "Golden score needed for highest positive priority."),
            ("auspicious_priority_score", "60", "Auspicious score used before specific categories."),
            ("auspicious_fallback_score", "50", "Auspicious fallback score."),
            ("specific_primary_score", "50", "Minimum score for a specific category to become primary."),
            ("specific_blocks_auspicious_score", "65", "Specific score that takes priority over broad Auspicious."),
            ("secondary_score", "50", "Minimum score for Secondary States."),
            ("score_cap", "100", "Maximum score for every category."),
        ]
        connection.executemany("INSERT INTO settings (key, value_json, description) VALUES (?, ?, ?)", settings)
        connection.executemany(
            """
            INSERT INTO categories (
                id, label, short_code, color, line_style, priority, primary_threshold,
                is_positive, primary_state, reason_text, best_actions, avoid_actions, enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            category_rows(),
        )
        connection.executemany(
            """
            INSERT INTO rules (
                id, category_id, label, points, enabled, conditions_json, description, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rule_rows(),
        )
        connection.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the V07 standalone SQLite rules database.")
    parser.add_argument("--force", action="store_true", help="Explicitly replace both baseline database files.")
    args = parser.parse_args()
    create_database(BUILD_RULES_DB, force=args.force)
    PUBLIC_RULES_DB.parent.mkdir(parents=True, exist_ok=True)
    if PUBLIC_RULES_DB.exists() and not args.force:
        raise FileExistsError(f"Hosted baseline already exists and was not overwritten: {PUBLIC_RULES_DB}")
    shutil.copy2(BUILD_RULES_DB, PUBLIC_RULES_DB)
    print(f"BUILD_RULES_DB={BUILD_RULES_DB}")
    print(f"PUBLIC_RULES_DB={PUBLIC_RULES_DB}")
    print(f"RULES={len(rule_rows())}")


if __name__ == "__main__":
    main()

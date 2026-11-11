const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_LORDS = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
const TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Parama Mitra"];
const HARSH_YOGAS = new Set(["Vyaghata", "Atiganda", "Shoola", "Ganda", "Vyatipata", "Vaidhriti"]);
const DIGNITIES = {
  sun: { own: ["Leo"], exalted: "Aries", debilitated: "Libra", mooltrikona: "Leo" },
  moon: { own: ["Cancer"], exalted: "Taurus", debilitated: "Scorpio", mooltrikona: "Taurus" },
  mars: { own: ["Aries", "Scorpio"], exalted: "Capricorn", debilitated: "Cancer", mooltrikona: "Aries" },
  mercury: { own: ["Gemini", "Virgo"], exalted: "Virgo", debilitated: "Pisces", mooltrikona: "Virgo" },
  jupiter: { own: ["Sagittarius", "Pisces"], exalted: "Cancer", debilitated: "Capricorn", mooltrikona: "Sagittarius" },
  venus: { own: ["Taurus", "Libra"], exalted: "Pisces", debilitated: "Virgo", mooltrikona: "Libra" },
  saturn: { own: ["Capricorn", "Aquarius"], exalted: "Libra", debilitated: "Aries", mooltrikona: "Aquarius" },
};

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function settingMap(bundle) {
  return Object.fromEntries((bundle?.settings || []).map((setting) => [setting.key, setting.value]));
}

function signDistance(fromSign, toSign) {
  const from = SIGNS.indexOf(fromSign);
  const to = SIGNS.indexOf(toSign);
  return from < 0 || to < 0 ? null : ((to - from + 12) % 12) + 1;
}

function houseLord(lagnaSign, houseNumber) {
  const lagnaIndex = SIGNS.indexOf(lagnaSign);
  if (lagnaIndex < 0) return "";
  return SIGN_LORDS[SIGNS[(lagnaIndex + Number(houseNumber) - 1) % 12]] || "";
}

function dignity(planet, sign) {
  const profile = DIGNITIES[planet];
  if (!profile || !sign) return "Neutral";
  if (sign === profile.exalted) return "Exalted";
  if (sign === profile.debilitated) return "Debilitated";
  if (sign === profile.mooltrikona) return "Mooltrikona";
  if (profile.own.includes(sign)) return "Own";
  return "Neutral";
}

function taraName(natalNakshatra, currentNakshatra) {
  const natal = NAKSHATRAS.indexOf(natalNakshatra);
  const current = NAKSHATRAS.indexOf(currentNakshatra);
  if (natal < 0 || current < 0) return "";
  const distance = ((current - natal + 27) % 27) + 1;
  return TARA_NAMES[(distance - 1) % 9];
}

function isYes(value) {
  return value === true || ["y", "yes", "active", "true", "1"].includes(String(value || "").trim().toLowerCase());
}

export function enrichWindow(window) {
  const context = { ...window };
  context.chandrabalamSignDistance = signDistance(window.natalMoonSign, window.moonSign);
  context.taraName = taraName(window.natalNakshatra, window.moonNakshatra);
  for (const house of [2, 3, 4, 5, 6, 7, 9, 10, 11]) {
    context[`house${house}Lord`] = houseLord(window.lagnaSign, house);
  }
  for (const planet of Object.keys(DIGNITIES)) {
    context[`${planet}Dignity`] = dignity(planet, window[`${planet}Sign`]);
  }
  context.isHarshYoga = HARSH_YOGAS.has(window.yoga);
  context.isWeakMoonRisk = Number(window.moonHouse) === 8 || Number(window.moonHouse) === 12 || (
    Number(window.moonHouse) === 6 && ["Vipat", "Pratyak", "Naidhana"].includes(context.taraName)
  );
  return context;
}

function conditionMatches(condition, context) {
  if (!condition || typeof condition !== "object") return false;
  if (Array.isArray(condition.all)) return condition.all.every((item) => conditionMatches(item, context));
  if (Array.isArray(condition.any)) return condition.any.some((item) => conditionMatches(item, context));

  const actual = context[condition.field];
  const expected = condition.value;
  switch (condition.op) {
    case "equals":
      return actual === expected || String(actual) === String(expected);
    case "not_equals":
      return !(actual === expected || String(actual) === String(expected));
    case "in":
      return Array.isArray(expected) && expected.some((value) => actual === value || String(actual) === String(value));
    case "not_in":
      return Array.isArray(expected) && !expected.some((value) => actual === value || String(actual) === String(value));
    case "contains_any": {
      const text = String(actual || "").toLowerCase();
      return Array.isArray(expected) && expected.some((value) => text.includes(String(value).toLowerCase()));
    }
    case "between":
      return Array.isArray(expected) && asNumber(actual, Number.NaN) >= Number(expected[0]) && asNumber(actual, Number.NaN) <= Number(expected[1]);
    case "yes":
      return isYes(actual);
    default:
      return false;
  }
}

function clamp(value, maximum = 100) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

export function evaluateWindow(rawWindow, bundle) {
  if (!bundle) return rawWindow;
  const context = enrichWindow(rawWindow);
  const settings = settingMap(bundle);
  const categories = (bundle.categories || []).filter((category) => category.enabled);
  const rulesByCategory = new Map();
  (bundle.rules || []).filter((rule) => rule.enabled).forEach((rule) => {
    if (!rulesByCategory.has(rule.category_id)) rulesByCategory.set(rule.category_id, []);
    rulesByCategory.get(rule.category_id).push(rule);
  });

  const scores = {};
  const matchedRules = {};
  const scoreCap = asNumber(settings.score_cap, 100);
  categories.forEach((category) => {
    const matches = (rulesByCategory.get(category.id) || []).filter((rule) => conditionMatches(rule.conditions, context));
    scores[category.id] = clamp(matches.reduce((total, rule) => total + asNumber(rule.points), 0), scoreCap);
    matchedRules[category.id] = matches.map((rule) => ({ id: rule.id, label: rule.label, points: rule.points }));
  });

  const avoidOverride = asNumber(settings.avoid_override_score, 80);
  if (asNumber(scores.avoid) >= avoidOverride) {
    categories.filter((category) => category.is_positive).forEach((category) => { scores[category.id] = 0; });
  }
  const positiveScores = categories
    .filter((category) => category.is_positive)
    .map((category) => asNumber(scores[category.id]));
  scores.overall = asNumber(scores.avoid) >= avoidOverride ? 0 : Math.max(0, ...positiveScores);

  const categoryById = Object.fromEntries(categories.map((category) => [category.id, category]));
  const specificIds = ["leadership", "wealth", "relationship", "learning", "execution", "travel", "purchase"]
    .filter((id) => categoryById[id]);
  const maxSpecific = Math.max(0, ...specificIds.map((id) => asNumber(scores[id])));
  const eligibleSpecificIds = specificIds.filter((id) => (
    asNumber(scores[id]) >= asNumber(categoryById[id]?.primary_threshold, asNumber(settings.specific_primary_score, 50))
  ));
  let primaryId = "neutral";
  if (asNumber(scores.avoid) >= avoidOverride) {
    primaryId = "avoid";
  } else if (asNumber(scores.golden) >= asNumber(categoryById.golden?.primary_threshold, asNumber(settings.golden_primary_score, 75))) {
    primaryId = "golden";
  } else if (
    asNumber(scores.auspicious) >= asNumber(settings.auspicious_priority_score, 60)
    && maxSpecific < asNumber(settings.specific_blocks_auspicious_score, 65)
  ) {
    primaryId = "auspicious";
  } else if (eligibleSpecificIds.length) {
    primaryId = eligibleSpecificIds
      .map((id) => categoryById[id])
      .sort((left, right) => asNumber(scores[right.id]) - asNumber(scores[left.id]) || left.priority - right.priority)[0].id;
  } else if (asNumber(scores.auspicious) >= asNumber(categoryById.auspicious?.primary_threshold, asNumber(settings.auspicious_fallback_score, 50))) {
    primaryId = "auspicious";
  }

  const primary = categoryById[primaryId] || {
    primary_state: "Neutral / Routine",
    reason_text: "No single strong state dominates this window.",
    best_actions: "Daily work, admin, maintenance, light planning, routine tasks.",
    avoid_actions: "Avoid major irreversible decisions unless necessary.",
  };
  const secondaryThreshold = asNumber(settings.secondary_score, 50);
  const secondaryStates = categories
    .filter((category) => category.id !== primaryId && !["neutral", "avoid"].includes(category.id) && asNumber(scores[category.id]) >= secondaryThreshold)
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3)
    .map((category) => category.primary_state)
    .join("; ");

  const hardRisk = asNumber(scores.avoid) >= avoidOverride;
  const riskLevel = hardRisk ? "High Risk" : context.isHarshYoga || context.isWeakMoonRisk ? "Medium Risk" : "Low Risk";
  let riskReason = "No major risk filter active.";
  if (matchedRules.avoid?.length) riskReason = `${matchedRules.avoid[0].label}; avoid important starts.`;
  else if (context.isHarshYoga) riskReason = "Harsh Yoga is active; use caution.";
  else if (context.isWeakMoonRisk) riskReason = "Moon placement is sensitive; avoid emotional or risky decisions.";

  return {
    ...rawWindow,
    ...context,
    scores,
    matchedRules,
    primaryState: primary.primary_state,
    primaryStateReason: primary.reason_text,
    secondaryStates,
    secondaryStateReason: secondaryStates ? "Additional categories meet their configured support threshold." : "No strong secondary state.",
    riskLevel,
    riskReason,
    bestActions: primary.best_actions,
    avoidActions: primary.avoid_actions,
  };
}

function dayQuality(bestScore, avoidDominant) {
  if (avoidDominant || bestScore < 35) return "Avoid";
  if (bestScore >= 85) return "Excellent";
  if (bestScore >= 70) return "Good";
  if (bestScore >= 50) return "Normal";
  return "Weak";
}

export function applyRulesToDaySummaries(rawSummaries, scoredWindows) {
  const byStart = new Map(scoredWindows.map((window) => [window.startDateTime, window]));
  return rawSummaries.map((summary) => {
    const bands = (summary.bands || []).map((band) => {
      const window = byStart.get(band.startDateTime);
      return window ? {
        ...window,
        ...band,
        score: window.scores.overall,
        categoryScores: window.scores,
      } : band;
    });
    const scoredBands = bands.filter((band) => Number.isFinite(Number(band.categoryScores?.overall)));
    const bestBand = scoredBands.sort((left, right) => Number(right.categoryScores.overall) - Number(left.categoryScores.overall))[0];
    const avoidDominant = scoredBands.length > 0
      && scoredBands.filter((band) => Number(band.categoryScores?.avoid) >= 80).length > scoredBands.length / 2;
    const bestScore = bestBand ? Number(bestBand.categoryScores.overall) : 0;
    return {
      ...summary,
      bands,
      bestWindowStart: bestBand?.start || null,
      bestWindowEnd: bestBand?.end || null,
      bestState: bestBand?.primaryState || null,
      bestScore,
      dayQuality: dayQuality(bestScore, avoidDominant),
    };
  });
}

export function describeCondition(condition) {
  if (!condition || typeof condition !== "object") return "Invalid condition";
  if (Array.isArray(condition.all)) return condition.all.map(describeCondition).join(" AND ");
  if (Array.isArray(condition.any)) return condition.any.map(describeCondition).join(" OR ");
  const value = Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value);
  const operators = {
    equals: "is", not_equals: "is not", in: "is one of", not_in: "is not one of",
    contains_any: "contains", between: "is between", yes: "is active",
  };
  return `${condition.field} ${operators[condition.op] || condition.op} ${condition.op === "yes" ? "" : value}`.trim();
}

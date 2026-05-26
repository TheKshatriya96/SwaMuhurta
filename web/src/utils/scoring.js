const POSITIVE_CATEGORIES = [
  "golden",
  "auspicious",
  "leadership",
  "wealth",
  "relationship",
  "learning",
  "execution",
  "travel",
  "purchase",
];

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

export function getOverallScore(window) {
  const scores = window?.scores || window?.categoryScores || {};
  const avoid = normalizeScore(scores.avoid);
  if (avoid !== null && avoid >= 80) return 0;

  const positives = POSITIVE_CATEGORIES
    .map((category) => normalizeScore(scores[category]))
    .filter((score) => score !== null);

  return positives.length ? Math.max(...positives) : null;
}

export function getCategoryScore(window, selectedCategory) {
  const scores = window?.scores || window?.categoryScores || {};
  if (selectedCategory === "overall") {
    return getOverallScore(window);
  }
  return normalizeScore(scores[selectedCategory]);
}

export function hasScore(window, selectedCategory) {
  return getCategoryScore(window, selectedCategory) !== null;
}

export function getScoreColor(score, category = "overall") {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return "var(--missing)";
  }

  const numericScore = Number(score);
  if (category === "avoid") {
    if (numericScore >= 80) return "var(--bad-strong)";
    if (numericScore >= 50) return "var(--bad-medium)";
    return "var(--good-soft)";
  }
  if (numericScore >= 85) return "var(--good-strong)";
  if (numericScore >= 70) return "var(--good-medium)";
  if (numericScore >= 50) return "var(--good-soft)";
  if (numericScore >= 35) return "var(--warn)";
  return "var(--bad-medium)";
}

export function compareWindows(current, next, selectedCategory) {
  if (!next) return { label: "No upcoming window", delta: null };
  if (!current) return { label: "No current window to compare", delta: null };

  const currentScore = getCategoryScore(current, selectedCategory);
  const nextScore = getCategoryScore(next, selectedCategory);
  if (currentScore === null || nextScore === null) {
    return { label: "Scores not calculated", delta: null };
  }

  const delta = nextScore - currentScore;
  if (delta >= 10) return { label: "Better", delta };
  if (delta <= -10) return { label: "Worse", delta };
  return { label: "Similar", delta };
}

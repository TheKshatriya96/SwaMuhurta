import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatTime,
  getCurrentWindow,
  getDurationMinutes,
  getNextWindow,
  getTodayWindows,
  parseDateTime,
} from "./utils/time";
import { compareWindows, getCategoryScore, getScoreColor } from "./utils/scoring";

const CATEGORY_LABELS = {
  overall: "Overall",
  golden: "Golden",
  auspicious: "Auspicious",
  leadership: "Leadership",
  wealth: "Wealth",
  relationship: "Relationship",
  learning: "Learning",
  execution: "Execution",
  travel: "Travel",
  purchase: "Purchase",
  avoid: "Avoid",
};

function getDashboardDataUrl() {
  return `${import.meta.env.BASE_URL}data/muhurat-data.json?v=${Date.now()}`;
}

function normalizeDashboardData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dashboard data must be a JSON object.");
  }

  const config = data.config;
  const windows = data.windows;
  const daySummaries = data.day_summaries || data.daySummaries;

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Dashboard data is missing a valid config object.");
  }
  if (!Array.isArray(windows)) {
    throw new Error("Dashboard data is missing a valid windows array.");
  }
  if (!Array.isArray(daySummaries)) {
    throw new Error("Dashboard data is missing a valid day_summaries array.");
  }

  return {
    config,
    windows,
    daySummaries,
    metadataUpdatedAt: data.updated_at || data.updatedAt || "",
  };
}

function formatMetadataDate(value, timeZone = "Asia/Kolkata") {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

function formatDateForZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatLongDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);
}

function calendarGrid(daySummaries) {
  if (!daySummaries.length) return [];
  const first = new Date(`${daySummaries[0].date}T00:00:00`);
  const monthStart = new Date(first.getFullYear(), first.getMonth(), 1);
  const monthEnd = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const offset = monthStart.getDay();
  const grid = [];
  for (let i = 0; i < offset; i += 1) {
    grid.push(null);
  }
  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const current = new Date(first.getFullYear(), first.getMonth(), day);
    const key = current.toISOString().slice(0, 10);
    grid.push(daySummaries.find((item) => item.date === key) ?? { date: key, empty: true });
  }
  return grid;
}

function scoreText(window, category) {
  const score = getCategoryScore(window, category);
  return Number.isFinite(score) ? score : "Data missing";
}

function formatDelta(delta) {
  if (!Number.isFinite(delta)) return "Data missing";
  return delta > 0 ? `+${delta}` : delta;
}

export default function App() {
  const timelineScrollRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [windows, setWindows] = useState([]);
  const [daySummaries, setDaySummaries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("overall");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [now, setNow] = useState(new Date());
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [lastUpdatedSource, setLastUpdatedSource] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const loadedAt = new Date();
        const response = await fetch(getDashboardDataUrl(), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`muhurat-data.json returned ${response.status} ${response.statusText}`);
        }

        const dashboardJson = await response.json();
        const normalizedData = normalizeDashboardData(dashboardJson);

        setConfig(normalizedData.config);
        setWindows(normalizedData.windows);
        setDaySummaries(normalizedData.daySummaries);
        setLastUpdated(normalizedData.metadataUpdatedAt || loadedAt.toISOString());
        setLastUpdatedSource(normalizedData.metadataUpdatedAt ? "metadata" : "file-load");
      } catch (loadError) {
        setError(`Unable to load dashboard data. Check public/data/muhurat-data.json. ${loadError.message}`);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const eventTimeZone = config?.eventTimezone || "Asia/Kolkata";
  const currentWindow = useMemo(() => getCurrentWindow(windows, now), [windows, now]);
  const nextWindow = useMemo(() => getNextWindow(windows, now), [windows, now]);

  useEffect(() => {
    if (!daySummaries.length) return;
    const todayInZone = formatDateForZone(now, eventTimeZone);
    const nextDate =
      daySummaries.find((summary) => summary.date === todayInZone)?.date ||
      currentWindow?.date ||
      nextWindow?.date ||
      daySummaries[0].date;
    setSelectedDate((previous) => previous || nextDate);
  }, [daySummaries, eventTimeZone, now, currentWindow, nextWindow]);

  const currentDaySummary = useMemo(
    () => daySummaries.find((summary) => summary.date === selectedDate) ?? null,
    [daySummaries, selectedDate],
  );

  const currentDayWindows = useMemo(() => getTodayWindows(windows, selectedDate), [windows, selectedDate]);

  useEffect(() => {
    if (!selectedWindow && currentWindow) {
      setSelectedWindow(currentWindow);
      return;
    }
    if (!selectedWindow && currentDayWindows.length) {
      setSelectedWindow(currentDayWindows[0]);
    }
  }, [currentWindow, currentDayWindows, selectedWindow]);

  const comparison = useMemo(
    () => compareWindows(currentWindow, nextWindow, selectedCategory),
    [currentWindow, nextWindow, selectedCategory],
  );

  const liveProgress = useMemo(() => {
    if (!currentWindow) return 0;
    const start = parseDateTime(currentWindow.startDateTime);
    const end = parseDateTime(currentWindow.endDateTime);
    if (!start || !end) return 0;
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }, [currentWindow, now]);

  const calendarItems = useMemo(() => calendarGrid(daySummaries), [daySummaries]);

  const handleTimelineWheel = (event) => {
    const wrapper = timelineScrollRef.current;
    if (!wrapper || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (wrapper.scrollWidth <= wrapper.clientWidth || event.deltaY === 0) return;

    const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, wrapper.scrollLeft + event.deltaY));
    if (nextScrollLeft === wrapper.scrollLeft) return;

    wrapper.scrollLeft = nextScrollLeft;
    event.preventDefault();
  };

  if (error) {
    return <div className="shell"><div className="card error-card">{error}</div></div>;
  }

  return (
    <div className="shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Live Muhurat Dashboard</p>
          <h1>Muhurat Finder V06</h1>
          <p className="subtitle">
            Current event location: {config?.eventLocationName || "Unknown"} · Last updated: {formatMetadataDate(lastUpdated, eventTimeZone) || "—"}
            {lastUpdatedSource === "file-load" ? " (loaded from file)" : ""}
          </p>
        </div>
        <div className="clock-card">
          <span>Live time</span>
          <strong>{formatTime(now, eventTimeZone)}</strong>
          <small>{formatLongDate(now, eventTimeZone)}</small>
        </div>
      </header>

      <section className="controls card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Category Selector</p>
            <h2>View emphasis</h2>
          </div>
        </div>
        <div className="category-grid">
          {(config?.availableCategories || Object.keys(CATEGORY_LABELS)).map((category) => (
            <label key={category} className={`category-chip ${selectedCategory === category ? "selected" : ""}`}>
              <input
                type="radio"
                name="category"
                value={category}
                checked={selectedCategory === category}
                onChange={() => setSelectedCategory(category)}
              />
              <span>{CATEGORY_LABELS[category] || category}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="hero-grid">
        <article className="card hero-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current Window</p>
              <h2>Live support now</h2>
            </div>
            <span className={`risk-pill ${currentWindow?.riskLevel?.toLowerCase().replace(/\s+/g, "-") || "neutral"}`}>
              {currentWindow?.riskLevel || (currentWindow ? "Data missing" : "No active window")}
            </span>
          </div>

          {currentWindow ? (
            <>
              <div className="hero-main">
                <div>
                  <h3>{currentWindow.primaryState || "Data missing"}</h3>
                  <p>
                    {formatTime(currentWindow.startDateTime, eventTimeZone)} to {formatTime(currentWindow.endDateTime, eventTimeZone)}
                  </p>
                </div>
                <div className="score-badge" style={{ background: getScoreColor(getCategoryScore(currentWindow, selectedCategory), selectedCategory) }}>
                  <span>{CATEGORY_LABELS[selectedCategory]}</span>
                  <strong>{scoreText(currentWindow, selectedCategory)}</strong>
                </div>
              </div>

              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${liveProgress}%` }} />
              </div>

              <div className="metric-grid">
                <div><span>Tithi</span><strong>{currentWindow.tithi || "—"}</strong></div>
                <div><span>Paksha</span><strong>{currentWindow.paksha || "—"}</strong></div>
                <div><span>Vaar</span><strong>{currentWindow.day || "—"}</strong></div>
                <div><span>Moon</span><strong>{currentWindow.moonNakshatra || "—"} · {currentWindow.moonSign || "—"}</strong></div>
                <div><span>Lagna</span><strong>{currentWindow.lagnaSign || "—"} {currentWindow.lagnaDeg ?? "—"}</strong></div>
                <div><span>Hora / Choghadiya</span><strong>{currentWindow.hora || "—"} · {currentWindow.choghadiya || "—"}</strong></div>
                <div><span>Yoga / Karana</span><strong>{currentWindow.yoga || "—"} · {currentWindow.karana || "—"}</strong></div>
              </div>

              <div className="narrative-grid">
                <div>
                  <h4>Better for</h4>
                  <p>{currentWindow.bestActions || "No special support noted."}</p>
                </div>
                <div>
                  <h4>Avoid initiating</h4>
                  <p>{currentWindow.avoidActions || "No special restriction noted."}</p>
                </div>
                <div>
                  <h4>State reason</h4>
                  <p>{currentWindow.primaryStateReason || "No current explanation available."}</p>
                </div>
                <div>
                  <h4>Risk note</h4>
                  <p>{currentWindow.riskReason || "No major risk filter is active."}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              No active window found for current time. Check data range or timezone.
            </div>
          )}
        </article>

        <article className="card next-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Upcoming Window</p>
              <h2>What comes next</h2>
            </div>
            <span className={`comparison-pill ${comparison.label.toLowerCase().replace(/\s+/g, "-")}`}>{comparison.label}</span>
          </div>

          {nextWindow ? (
            <>
              <h3>{nextWindow.primaryState || "Data missing"}</h3>
              <p className="next-time">
                {formatLongDate(parseDateTime(nextWindow.startDateTime), eventTimeZone)}
                <br />
                {formatTime(nextWindow.startDateTime, eventTimeZone)} to {formatTime(nextWindow.endDateTime, eventTimeZone)}
              </p>
              <div className="score-compare">
                <div>
                  <span>Selected category</span>
                  <strong>{scoreText(nextWindow, selectedCategory)}</strong>
                </div>
                <div>
                  <span>Delta</span>
                  <strong>{formatDelta(comparison.delta)}</strong>
                </div>
              </div>
              <p className="compact-text"><strong>Risk:</strong> {nextWindow.riskLevel || "Data missing"}</p>
              <p className="compact-text"><strong>Better for:</strong> {nextWindow.bestActions || "No highlight."}</p>
              <p className="compact-text"><strong>Why:</strong> {nextWindow.primaryStateReason || "No explanation available."}</p>
            </>
          ) : (
            <div className="empty-state">No future window in the exported range.</div>
          )}
        </article>
      </section>

      <section className="timeline-section">
        <article className="card timeline-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current-Day Timeline</p>
              <h2>{selectedDate || "Select a day"}</h2>
            </div>
            <span>{currentDaySummary?.dayQuality || "—"}</span>
          </div>

          {currentDaySummary ? (
            <>
              <div
                className="timeline-scroll-wrapper"
                ref={timelineScrollRef}
                tabIndex={0}
                onWheel={handleTimelineWheel}
              >
                <div className="timeline-track">
                {currentDaySummary.bands.map((band) => {
                  const minutes = getDurationMinutes(band.startDateTime, band.endDateTime);
                  const totalMinutes = getDurationMinutes(currentDaySummary.sunrise, currentDaySummary.midnight) || 1;
                  const width = Math.max(1.25, (minutes / totalMinutes) * 100);
                  const score = getCategoryScore(band, selectedCategory);
                  return (
                    <button
                      key={`${band.startDateTime}-${band.endDateTime}`}
                      type="button"
                      className={`timeline-segment ${selectedWindow?.startDateTime === band.startDateTime ? "active" : ""}`}
                      style={{ flexBasis: `${width}%`, background: getScoreColor(score, selectedCategory) }}
                      title={`${band.start} - ${band.end} · ${band.primaryState || "Data missing"} · ${scoreText(band, selectedCategory)} · ${band.riskLevel || "Data missing"}`}
                      onClick={() => {
                        const match = currentDayWindows.find((window) => window.startDateTime === band.startDateTime);
                        if (match) setSelectedWindow(match);
                      }}
                    >
                      <span>{band.start}</span>
                    </button>
                  );
                })}
                </div>
              </div>
              <div className="timeline-meta">
                <span>Sunrise {formatTime(currentDaySummary.sunrise, eventTimeZone)}</span>
                <span>Midnight {formatTime(currentDaySummary.midnight, eventTimeZone)}</span>
              </div>
            </>
          ) : (
            <div className="empty-state">No summary available for the selected day.</div>
          )}
        </article>

        <article className="card selected-window-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selected Window</p>
              <h2>{selectedWindow?.primaryState || (selectedWindow ? "Data missing" : "Choose a band")}</h2>
            </div>
          </div>
          {selectedWindow ? (
            <div className="detail-grid">
              <div><span>Time</span><strong>{formatTime(selectedWindow.startDateTime, eventTimeZone)} - {formatTime(selectedWindow.endDateTime, eventTimeZone)}</strong></div>
              <div><span>Risk</span><strong>{selectedWindow.riskLevel || "Data missing"}</strong></div>
              <div><span>Tithi</span><strong>{selectedWindow.tithi || "—"}</strong></div>
              <div><span>Nakshatra</span><strong>{selectedWindow.moonNakshatra || "—"}</strong></div>
              <div><span>Lagna</span><strong>{selectedWindow.lagnaSign || "—"} {selectedWindow.lagnaDeg ?? "—"}</strong></div>
              <div><span>Hora / Choghadiya</span><strong>{selectedWindow.hora || "—"} · {selectedWindow.choghadiya || "—"}</strong></div>
              <div className="detail-copy"><span>Best for</span><p>{selectedWindow.bestActions || "No highlight."}</p></div>
              <div className="detail-copy"><span>Avoid for</span><p>{selectedWindow.avoidActions || "No caution."}</p></div>
              <div className="detail-copy"><span>Primary reason</span><p>{selectedWindow.primaryStateReason || "No explanation available."}</p></div>
              <div className="detail-copy"><span>Risk reason</span><p>{selectedWindow.riskReason || "No major risk filter."}</p></div>
            </div>
          ) : (
            <div className="empty-state">Click a timeline segment or day band to inspect details.</div>
          )}
        </article>
      </section>

      <section className="calendar-section card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Monthly Calendar</p>
            <h2>Band view by day</h2>
          </div>
          <span>Click a day to inspect its windows</span>
        </div>

        <div className="calendar-head">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarItems.map((entry, index) => {
            if (!entry) return <div key={`blank-${index}`} className="calendar-day empty" />;
            if (entry.empty) {
              return (
                <button key={entry.date} type="button" className="calendar-day muted">
                  <span>{Number(entry.date.slice(-2))}</span>
                </button>
              );
            }

            return (
              <button
                key={entry.date}
                type="button"
                className={`calendar-day ${selectedDate === entry.date ? "selected" : ""}`}
                onClick={() => setSelectedDate(entry.date)}
              >
                <div className="calendar-top">
                  <strong>{Number(entry.date.slice(-2))}</strong>
                  <span>{entry.day?.slice(0, 3) || ""}</span>
                </div>
                <div className="calendar-bands" title={`${entry.bestState} · ${entry.bestWindowStart}-${entry.bestWindowEnd}`}>
                  {entry.bands.map((band) => {
                    const minutes = getDurationMinutes(band.startDateTime, band.endDateTime);
                    const totalMinutes = getDurationMinutes(entry.sunrise, entry.midnight) || 1;
                    return (
                      <div
                        key={`${entry.date}-${band.startDateTime}`}
                        className="calendar-band"
                        style={{
                          height: `${Math.max(3, (minutes / totalMinutes) * 100)}%`,
                          background: getScoreColor(getCategoryScore(band, selectedCategory), selectedCategory),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="calendar-body">
                  <p>{entry.mainTithi || "—"}</p>
                  <p>{entry.mainNakshatra || "—"}</p>
                  <strong>{entry.bestState || "Data missing"}</strong>
                  <span>{entry.bestWindowStart || "—"} - {entry.bestWindowEnd || "—"}</span>
                  <em>{entry.dayQuality}</em>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

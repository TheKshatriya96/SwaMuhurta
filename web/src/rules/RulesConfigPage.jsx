import { useEffect, useMemo, useRef, useState } from "react";
import { describeCondition } from "./ruleEngine";


function RuleRow({ rule, maximumPoints, onChange }) {
  const [conditionText, setConditionText] = useState(() => JSON.stringify(rule.conditions));
  const [conditionError, setConditionError] = useState("");

  useEffect(() => {
    setConditionText(JSON.stringify(rule.conditions));
    setConditionError("");
  }, [rule.id, rule.conditions]);

  const updateCondition = (value) => {
    setConditionText(value);
    try {
      const conditions = JSON.parse(value);
      setConditionError("");
      onChange({ ...rule, conditions });
    } catch {
      setConditionError("Invalid JSON; the last valid condition remains active.");
    }
  };

  const magnitude = Math.min(100, Math.abs(Number(rule.points) || 0) / Math.max(1, maximumPoints) * 100);
  return (
    <article className={`rule-row ${rule.enabled ? "" : "disabled"}`}>
      <div className="rule-row-main">
        <label className="rule-toggle">
          <input type="checkbox" checked={rule.enabled} onChange={(event) => onChange({ ...rule, enabled: event.target.checked })} />
          <span />
        </label>
        <div className="rule-copy">
          <input
            className="rule-name-input"
            value={rule.label}
            onChange={(event) => onChange({ ...rule, label: event.target.value })}
            aria-label="Rule name"
          />
          <p>{describeCondition(rule.conditions)}</p>
        </div>
        <label className={`points-input ${Number(rule.points) < 0 ? "negative" : "positive"}`}>
          <span>Points</span>
          <input
            type="number"
            min="-100"
            max="100"
            value={rule.points}
            onChange={(event) => onChange({ ...rule, points: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="rule-point-track" aria-hidden="true">
        <span className={Number(rule.points) < 0 ? "negative" : "positive"} style={{ width: `${magnitude}%` }} />
      </div>
      <details className="condition-editor">
        <summary>Edit condition</summary>
        <textarea value={conditionText} onChange={(event) => updateCondition(event.target.value)} spellCheck="false" />
        {conditionError ? <p className="field-error">{conditionError}</p> : null}
      </details>
    </article>
  );
}

function ScoreChart({ categories, scores }) {
  const visible = categories.filter((category) => !["neutral"].includes(category.id));
  return (
    <div className="score-chart" aria-label="Live category score chart">
      {visible.map((category) => {
        const score = Number(scores?.[category.id]) || 0;
        return (
          <div className="score-chart-row" key={category.id}>
            <span>{category.short_code}</span>
            <div><i style={{ width: `${Math.max(1, score)}%`, background: category.color }} /></div>
            <strong>{score}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default function RulesConfigPage({
  bundle,
  source,
  previewWindow,
  dirty,
  busy,
  message,
  onChange,
  onSave,
  onReset,
  onExport,
  onImport,
  onBack,
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("golden");
  const [search, setSearch] = useState("");
  const fileRef = useRef(null);
  const categories = bundle?.categories || [];
  const rules = bundle?.rules || [];
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || categories[0];
  const categoryRules = rules.filter((rule) => rule.category_id === selectedCategory?.id);
  const filteredRules = categoryRules.filter((rule) => rule.label.toLowerCase().includes(search.trim().toLowerCase()));
  const maximumPoints = Math.max(1, ...categoryRules.map((rule) => Math.abs(Number(rule.points) || 0)));
  const activeRuleCount = rules.filter((rule) => rule.enabled).length;
  const totalRuleCount = rules.length;
  const positiveCapacity = categoryRules.filter((rule) => rule.enabled && Number(rule.points) > 0).reduce((total, rule) => total + Number(rule.points), 0);
  const penaltyCapacity = categoryRules.filter((rule) => rule.enabled && Number(rule.points) < 0).reduce((total, rule) => total + Math.abs(Number(rule.points)), 0);

  const updateCategory = (patch) => {
    onChange({
      ...bundle,
      categories: categories.map((category) => category.id === selectedCategory.id ? { ...category, ...patch } : category),
    });
  };

  const updateRule = (nextRule) => {
    onChange({
      ...bundle,
      rules: rules.map((rule) => rule.id === nextRule.id ? nextRule : rule),
    });
  };

  const updateSetting = (key, value) => {
    onChange({
      ...bundle,
      settings: bundle.settings.map((setting) => setting.key === key ? { ...setting, value: Number(value) } : setting),
    });
  };

  const settings = useMemo(() => Object.fromEntries((bundle?.settings || []).map((setting) => [setting.key, setting])), [bundle]);

  return (
    <main className="rules-page">
      <header className="rules-hero card">
        <div>
          <p className="eyebrow">Rule Laboratory</p>
          <h1>Live Muhurat Rule Config</h1>
          <p>Inspect every condition, tune its points, and see the selected window recalculate immediately.</p>
        </div>
        <div className="rules-actions">
          <button type="button" className="secondary-button" onClick={onBack}>Dashboard</button>
          <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>Import DB</button>
          <button type="button" className="secondary-button" onClick={onExport}>Export DB</button>
          <button type="button" className="secondary-button danger" onClick={onReset}>Reset baseline</button>
          <button type="button" className="primary-button" disabled={!dirty || busy} onClick={onSave}>{busy ? "Saving…" : "Save to browser DB"}</button>
          <input
            ref={fileRef}
            type="file"
            accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      <section className="rule-status-grid">
        <article className="card rule-stat"><span>Database source</span><strong>{source}</strong><small>{dirty ? "Unsaved live edits" : "Saved and active"}</small></article>
        <article className="card rule-stat"><span>Active rules</span><strong>{activeRuleCount} / {totalRuleCount}</strong><small>Disabled rules contribute zero points</small></article>
        <article className="card rule-stat"><span>Selected category</span><strong>{selectedCategory?.label || "—"}</strong><small>+{positiveCapacity} support · −{penaltyCapacity} penalties</small></article>
        <article className="card rule-stat accent"><span>Live result</span><strong>{previewWindow?.primaryState || "No window"}</strong><small>{previewWindow?.riskLevel || "Select dashboard window"}</small></article>
      </section>

      {message ? <p className="rule-message">{message}</p> : null}

      <section className="rules-workspace">
        <aside className="card rule-sidebar">
          <p className="eyebrow">Categories</p>
          <div className="rule-category-list">
            {categories.filter((category) => category.id !== "neutral").map((category) => (
              <button
                type="button"
                key={category.id}
                className={category.id === selectedCategory?.id ? "active" : ""}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <i style={{ background: category.color }} />
                <span>{category.label}</span>
                <strong>{previewWindow?.scores?.[category.id] ?? 0}</strong>
              </button>
            ))}
          </div>
          <div className="threshold-panel">
            <p className="eyebrow">Engine thresholds</p>
            {["avoid_override_score", "golden_primary_score", "auspicious_priority_score", "specific_primary_score", "secondary_score"].map((key) => (
              <label key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                <input type="number" min="0" max="100" value={settings[key]?.value ?? 0} onChange={(event) => updateSetting(key, event.target.value)} />
              </label>
            ))}
          </div>
        </aside>

        <div className="rules-main-column">
          <section className="card live-rule-chart">
            <div className="section-heading">
              <div><p className="eyebrow">Points Chart</p><h2>Live selected-window scores</h2></div>
              <span>{previewWindow?.start?.slice(0, 5) || "—"} · {previewWindow?.hora || "—"} / {previewWindow?.choghadiya || "—"}</span>
            </div>
            <ScoreChart categories={categories} scores={previewWindow?.scores} />
          </section>

          <section className="card category-editor">
            <div className="category-editor-head">
              <div>
                <p className="eyebrow">{selectedCategory?.short_code} Category</p>
                <input className="category-title-input" value={selectedCategory?.label || ""} onChange={(event) => updateCategory({ label: event.target.value })} />
              </div>
              <div className="category-meta-inputs">
                <label><span>Primary threshold</span><input type="number" min="0" max="100" value={selectedCategory?.primary_threshold ?? 0} onChange={(event) => updateCategory({ primary_threshold: Number(event.target.value) })} /></label>
                <label><span>Short code</span><input maxLength="3" value={selectedCategory?.short_code || ""} onChange={(event) => updateCategory({ short_code: event.target.value })} /></label>
                <label><span>Color</span><input type="color" value={selectedCategory?.color || "#ffffff"} onChange={(event) => updateCategory({ color: event.target.value })} /></label>
              </div>
            </div>
            <div className="rule-search-row">
              <input placeholder="Search rules…" value={search} onChange={(event) => setSearch(event.target.value)} />
              <span>{filteredRules.length} rules</span>
            </div>
            <div className="rule-list">
              {filteredRules.map((rule) => <RuleRow key={rule.id} rule={rule} maximumPoints={maximumPoints} onChange={updateRule} />)}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

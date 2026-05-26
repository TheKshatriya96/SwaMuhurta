# V06 Dashboard Spec — Live Muhurat Dashboard

## Project

You are working on the Muhurat Finder project.

V04 is the clean foundation workbook.
V05 is the parent-state rule engine workbook.

V06 must build a live dashboard that reads V05 output data and displays the current muhurat window, upcoming window, timeline strips, and monthly calendar.

## Source workbook

Use:

v05/output/MuhuratFinder_V05_ParentStateEngine_FIXED.xlsx

If the fixed file has a different final name, inspect the v05/output folder and use the latest valid V05 workbook that opens without Excel repair.

## Output folders

Create:

v06_dashboard/

Inside it create:

- export_excel_to_json.py
- web/ React + Vite dashboard
- web/public/data/windows.json
- web/public/data/day_summary.json
- web/public/data/config.json

## Important rules

Do not modify V04 files.
Do not modify V05 files.
Do not change Swiss Ephemeris logic.
Do not recalculate astrology in React.
Do not implement new scoring logic in React.
Do not create a backend yet.
Dashboard should consume JSON files exported from Excel.

React dashboard must be a display/filtering layer only.

## Data export task

Create Python script:

v06_dashboard/export_excel_to_json.py

This script should:

1. Read the V05 workbook.
2. Read EPHEMERIS_RAW sheet.
3. Convert rows into clean JSON.
4. Save JSON files into:

v06_dashboard/web/public/data/

Files:

- windows.json
- day_summary.json
- config.json

Use openpyxl or pandas, whichever is safer.

Do not rely on Excel formula recalculation from Python.
If formula cells already have cached values available, read them.
If cached values are not available, handle gracefully and report missing values.

If openpyxl cannot read cached formula outputs reliably, export using formulas as displayed values only if available. Otherwise, add a clear warning in the script output.

## Required columns from EPHEMERIS_RAW

Read these if available:

Basic time:
- Date
- Day
- Start
- End
- StartDateTime
- EndDateTime
- Sunrise
- Sunset
- Timezone

Panchang:
- Paksha
- Tithi
- TithiNo
- MoonNakshatra
- MoonPada
- Yoga
- Karana
- Choghadiya
- Hora
- Abhijit
- RahuKaal
- Yamaganda
- Gulika
- Durmuhurta
- Varjyam

Lagna:
- LagnaSign
- LagnaDeg
- LagnaNakshatra
- LagnaPada

Moon:
- MoonSign
- MoonDeg
- MoonHouse

Location/natal:
- EventLocationName
- EventLatitude
- EventLongitude
- EventTimezone
- EventDST
- NatalMoonSign
- NatalNakshatra
- NatalLagna

V05 outputs:
- PrimaryState
- PrimaryStateReason
- SecondaryStates
- SecondaryStateReason
- RiskLevel
- RiskReason
- BestActions
- AvoidActions
- AvoidScore
- GoldenScore
- AuspiciousScore
- LeadershipScore
- WealthScore
- RelationshipScore
- LearningScore
- ExecutionScore
- TravelScore
- PurchaseScore

If any optional column is missing, export blank/null value but do not crash.
If critical time columns are missing, raise clear error.

## windows.json format

Each row should export as:

{
  "date": "2026-05-21",
  "day": "Thursday",
  "start": "17:31:00",
  "end": "17:38:00",
  "startDateTime": "2026-05-21T17:31:00+05:30",
  "endDateTime": "2026-05-21T17:38:00+05:30",
  "sunrise": "2026-05-21T06:01:00+05:30",
  "sunset": "2026-05-21T19:08:00+05:30",
  "timezone": "Asia/Kolkata",

  "paksha": "Shukla Paksha",
  "tithi": "Shashthi",
  "tithiNo": 6,
  "moonNakshatra": "Pushya",
  "moonPada": 3,
  "moonSign": "Cancer",
  "moonHouse": 10,
  "lagnaSign": "Libra",
  "lagnaDeg": 15.25,
  "lagnaNakshatra": "Swati",
  "lagnaPada": 3,
  "yoga": "Vriddhi",
  "karana": "Kaulava",
  "choghadiya": "Shubha",
  "hora": "Venus",

  "primaryState": "Learning / Wisdom",
  "primaryStateReason": "...",
  "secondaryStates": "...",
  "secondaryStateReason": "...",
  "riskLevel": "Low Risk",
  "riskReason": "...",
  "bestActions": "...",
  "avoidActions": "...",

  "scores": {
    "avoid": 0,
    "golden": 55,
    "auspicious": 70,
    "leadership": 42,
    "wealth": 60,
    "relationship": 48,
    "learning": 82,
    "execution": 66,
    "travel": 40,
    "purchase": 64
  }
}

## day_summary.json format

Group windows by date.

For each day:

- date
- day
- sunrise
- midnight
- mainTithi
- mainNakshatra
- bestWindowStart
- bestWindowEnd
- bestState
- bestScore
- dayQuality
- bands

Important:
The month calendar should skip midnight-to-sunrise.
Day bands should cover sunrise to midnight.

For each day:
- dayStart = sunrise
- dayEnd = next midnight after date
- bands should only include windows where StartDateTime >= sunrise and StartDateTime < midnight.

BestScore should be based on the maximum score for selected general quality.

For general quality use:
max of:
- GoldenScore
- AuspiciousScore
- LeadershipScore
- WealthScore
- RelationshipScore
- LearningScore
- ExecutionScore
- TravelScore
- PurchaseScore

But if AvoidScore >= 80, treat quality as bad.

dayQuality:
- Excellent if bestScore >= 85
- Good if bestScore >= 70
- Normal if bestScore >= 50
- Weak if bestScore >= 35
- Avoid if bestScore < 35 or most useful windows are Avoid

bands array:

{
  "start": "06:01",
  "end": "07:25",
  "startDateTime": "...",
  "endDateTime": "...",
  "primaryState": "Neutral / Routine",
  "riskLevel": "Low Risk",
  "score": 45,
  "categoryScores": {
    "overall": 45,
    "golden": 0,
    "auspicious": 40,
    "leadership": 30,
    "wealth": 25,
    "relationship": 40,
    "learning": 45,
    "execution": 35,
    "travel": 20,
    "purchase": 30,
    "avoid": 0
  }
}

## config.json

Export:

{
  "generatedAt": "...",
  "sourceWorkbook": "...",
  "eventLocationName": "...",
  "eventLatitude": ...,
  "eventLongitude": ...,
  "eventTimezone": "...",
  "natalMoonSign": "...",
  "natalNakshatra": "...",
  "natalLagna": "...",
  "availableCategories": [
    "overall",
    "golden",
    "auspicious",
    "leadership",
    "wealth",
    "relationship",
    "learning",
    "execution",
    "travel",
    "purchase",
    "avoid"
  ]
}

## React dashboard

Create React + Vite app in:

v06_dashboard/web/

Use:
- React
- Vite
- Tailwind CSS if already easy to set up
- Plain CSS is acceptable if Tailwind setup slows things down

Dashboard should load:

/data/windows.json
/data/day_summary.json
/data/config.json

No backend.

## Dashboard layout

### Section 1: Live Current Window

At top, show current live time and current muhurat window.

Display:

- Current time
- Current date
- Event location
- PrimaryState
- RiskLevel
- Current window start-end
- Live progress bar from StartDateTime to EndDateTime
- Tithi
- Paksha
- Vaar / Day
- Moon Nakshatra
- Moon Sign
- Lagna Sign + Lagna Deg
- Hora
- Choghadiya
- Yoga
- Karana
- BestActions
- AvoidActions
- PrimaryStateReason
- RiskReason

If no current window is found:
Show:
"No active window found for current time. Check data range or timezone."

Current window logic:
Find row where:
startDateTime <= now < endDateTime

Use browser current time.
Assume event timezone from config.
Be careful with ISO datetime parsing.

### Section 2: Upcoming Window

Show next window after current time.

Display:

- Next window time
- PrimaryState
- RiskLevel
- BestActions
- Comparison with current:
  Better / Worse / Similar

Comparison should depend on selected category.

If selected category = overall:
Use max useful score excluding avoid unless avoid is active.

If selected category = wealth:
Compare current scores.wealth vs next scores.wealth.

Threshold:
- Better if nextScore >= currentScore + 10
- Worse if nextScore <= currentScore - 10
- Similar otherwise

### Section 3: Category selector

Radio buttons:

- Overall
- Golden
- Auspicious
- Leadership
- Wealth
- Relationship
- Learning
- Execution
- Travel
- Purchase
- Avoid

Selected category affects:
- Timeline strip coloring
- Upcoming comparison
- Month calendar band coloring

Default:
Overall

### Section 4: Timeline Strip

Show all windows for the current day from sunrise to midnight.

Skip midnight-to-sunrise.

Each window is a horizontal block.

Block width:
duration in minutes proportional to total displayed day duration.

Block color:
based on selected category score.

If selected category = Overall:
Use generalQualityScore.

GeneralQualityScore:
If avoid score >= 80, score = 0.
Else max of golden, auspicious, leadership, wealth, relationship, learning, execution, travel, purchase.

If selected category = Avoid:
Use avoid score.
Avoid score >= 80 should be red/dark.

Color scale for positive categories:
- >=85 dark green
- >=70 green
- >=50 yellow
- >=35 orange
- <35 red/gray

For Avoid category:
- >=80 dark red
- >=50 orange/red
- <50 green/neutral

Each block tooltip/title should show:
- Start-End
- PrimaryState
- Selected category score
- RiskLevel
- BestActions

Clicking a block should show details below or in a side panel:
- all Panchang details
- scores
- reasons

### Section 5: Monthly Calendar

Show the whole month as calendar grid.

Each day block should have:

- Date number
- Day short name
- Main tithi
- Main nakshatra
- Best state
- Best window time
- Overall day quality label

Inside each day block, show a small vertical banded strip.

Vertical strip logic:
- bottom = sunrise
- top = midnight
- skip midnight-to-sunrise
- each band height = duration proportion
- band color = selected category score

This is important:
Do not show a normal flat day color only.
Each day should visually show changing quality bands from sunrise to midnight.

Clicking a day:
- updates current day timeline section to that day
or
- opens expanded list of top 5 windows for that day

Top 5 windows should sort by selected category score.

## Visual style

Make it minimal, clean, dark dashboard style.

Use cards.
Use clear color coding.
Avoid clutter.
Mobile responsive is good but desktop-first is acceptable.

Do not overuse astrology jargon in the dashboard.
Keep labels practical.

## Utility functions

Create:

src/utils/time.js

Functions:
- parseDateTime(value)
- formatTime(value)
- isCurrentWindow(window, now)
- getCurrentWindow(windows, now)
- getNextWindow(windows, now)
- getTodayWindows(windows, date)
- getDurationMinutes(start, end)

Create:

src/utils/scoring.js

Functions:
- getCategoryScore(window, selectedCategory)
- getOverallScore(window)
- getScoreColor(score, category)
- compareWindows(current, next, selectedCategory)

## Validation

After implementation:

1. Run Python exporter.
2. Confirm these files exist:
   - v06_dashboard/web/public/data/windows.json
   - v06_dashboard/web/public/data/day_summary.json
   - v06_dashboard/web/public/data/config.json

3. Confirm JSON is valid.
4. Install web dependencies if needed.
5. Run build:
   npm run build

6. Confirm build succeeds.
7. Report:
   - files created
   - source workbook used
   - number of windows exported
   - number of days summarized
   - build result

## Important

Do not promise guaranteed outcomes in UI text.

Use wording like:
- supports
- favorable
- avoid initiating
- risk active
- better for
- weaker for

Do not use:
- guaranteed success
- 100 percent gains
- definitely fruitful
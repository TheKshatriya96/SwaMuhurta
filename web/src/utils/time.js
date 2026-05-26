export function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(value, timeZone = "Asia/Kolkata") {
  const date = typeof value === "string" ? parseDateTime(value) : value;
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(date);
}

export function isCurrentWindow(window, now = new Date()) {
  const start = parseDateTime(window?.startDateTime);
  const end = parseDateTime(window?.endDateTime);
  if (!start || !end) return false;
  return start <= now && now < end;
}

export function getCurrentWindow(windows, now = new Date()) {
  return windows.find((window) => isCurrentWindow(window, now)) ?? null;
}

export function getNextWindow(windows, now = new Date()) {
  return (
    windows.find((window) => {
      const start = parseDateTime(window?.startDateTime);
      return start && start > now;
    }) ?? null
  );
}

export function getTodayWindows(windows, dateText) {
  if (!dateText) return [];
  return windows.filter((window) => window.date === dateText);
}

export function getDurationMinutes(start, end) {
  const startDate = typeof start === "string" ? parseDateTime(start) : start;
  const endDate = typeof end === "string" ? parseDateTime(end) : end;
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

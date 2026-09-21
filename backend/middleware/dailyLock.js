/**
 * Daily-lock validation: the date itself is the source of truth.
 * Only records for the user's current local day may be written —
 * previous days are read-only, future days are upcoming.
 *
 * The client sends its local `client_today` (YYYY-MM-DD) alongside
 * `log_date`. The server requires `log_date === client_today` and
 * sanity-checks `client_today` against the server date (±1 day) so a
 * stale/spoofed client date cannot unlock arbitrary history. This keeps
 * working across legitimate timezone differences without the server
 * needing to know the user's timezone.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n) => String(n).padStart(2, '0');

function serverTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function diffDays(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function validateDailyWrite(req, res) {
  const { log_date, client_today } = req.body || {};

  if (!log_date || !DATE_RE.test(log_date)) {
    res.status(400).json({ error: 'A valid log_date (YYYY-MM-DD) is required.' });
    return null;
  }
  if (!client_today || !DATE_RE.test(client_today)) {
    res.status(400).json({ error: 'client_today (YYYY-MM-DD) is required.' });
    return null;
  }
  if (log_date !== client_today) {
    res.status(403).json({ error: 'Only today\'s records can be modified. Historical records are read-only.' });
    return null;
  }
  if (Math.abs(diffDays(client_today, serverTodayStr())) > 1) {
    res.status(403).json({ error: 'Client date is out of sync. Please check your device date.' });
    return null;
  }
  return log_date;
}

module.exports = { validateDailyWrite };

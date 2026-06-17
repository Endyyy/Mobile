const PARIS_TIMEZONE = 'Europe/Paris';

export function formatParisDate(timestamp) {
  if (!timestamp?.toDate) return 'Unknown date';

  return timestamp.toDate().toLocaleString('fr-FR', {
    timeZone: PARIS_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

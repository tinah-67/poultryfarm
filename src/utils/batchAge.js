const parseLocalDate = value => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
};

export const formatBatchAge = (startDate, referenceDate = new Date()) => {
  const start = parseLocalDate(startDate);
  const reference = parseLocalDate(referenceDate);

  if (!start || !reference || reference < start) return null;

  const days = Math.floor((reference.getTime() - start.getTime()) / 86400000);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'}`;

  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  const weekText = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;

  return remainingDays
    ? `${weekText}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`
    : weekText;
};

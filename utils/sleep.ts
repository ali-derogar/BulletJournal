export function calculateSleepDuration(
  sleepTime: string | null,
  wakeTime: string | null
): number {
  if (!sleepTime || !wakeTime) {
    return 0;
  }

  const [sleepHours, sleepMinutes] = sleepTime.split(":").map(Number);
  const [wakeHours, wakeMinutes] = wakeTime.split(":").map(Number);

  let sleepTotalMinutes = sleepHours * 60 + sleepMinutes;
  let wakeTotalMinutes = wakeHours * 60 + wakeMinutes;

  if (wakeTotalMinutes < sleepTotalMinutes) {
    wakeTotalMinutes += 24 * 60;
  }

  const durationMinutes = wakeTotalMinutes - sleepTotalMinutes;
  return Math.round((durationMinutes / 60) * 10) / 10;
}

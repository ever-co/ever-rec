const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Formats a length in seconds as `MM:SS`, or as `HH:MM:SS` once the length
 * reaches one hour so long recordings do not lose their hours.
 * Invalid input (NaN, Infinity, negative) is formatted as `00:00`.
 */
const videoDurationConverter = (length: number) => {
  const totalSeconds =
    Number.isFinite(length) && length > 0 ? Math.floor(length) : 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
};

export { videoDurationConverter };

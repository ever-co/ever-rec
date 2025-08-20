export function getExpirationTime(expiresIn: number | string): Date {
  const expiresInMs = Number(expiresIn) * 1000;

  if (isNaN(expiresInMs)) {
    throw new Error('expiresIn must be a valid number or numeric string');
  }

  return new Date(Date.now() + expiresInMs);
}

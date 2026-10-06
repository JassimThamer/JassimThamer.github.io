export const SIGNIN_URL = 'https://learn.reboot01.com/api/auth/signin';

export async function signIn(identifier, password) {
  const res = await fetch(SIGNIN_URL, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${identifier}:${password}`) },
  });

  if (!res.ok) {
    throw new Error('Invalid username/email or password.');
  }

  let token = await res.text();
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') token = parsed;
  } catch (_) {}
  return token;
}

export function decodeJWT(token) {
  const payload = token.split('.')[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return JSON.parse(json);
}

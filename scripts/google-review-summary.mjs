import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function readSummary(env, request = fetch) {
  const url = new URL(env.GOOGLE_REVIEWS_URL);
  if (url.origin !== 'https://mybusiness.googleapis.com' || url.username || url.password ||
      !/^\/v4\/accounts\/\d+\/locations\/\d+\/reviews$/.test(url.pathname)) {
    throw new Error('Comprueba GOOGLE_REVIEWS_URL.');
  }
  url.search = new URLSearchParams({ fields: 'averageRating,totalReviewCount', pageSize: '1' });
  const token = await request('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({
      grant_type: 'refresh_token', client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN
    })
  });
  if (!token.ok) throw new Error('Google ha rechazado la renovación OAuth (HTTP ' + token.status + ').');
  const { access_token } = await token.json();
  if (!access_token) throw new Error('Falta el token de acceso.');
  const response = await request(url, {
    headers: { Authorization: 'Bearer ' + access_token }, redirect: 'error', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Consulta de reseñas fallida (HTTP ' + response.status + ').');
  const { totalReviewCount = 0, averageRating } = await response.json();
  if (!Number.isSafeInteger(totalReviewCount) || totalReviewCount < 0 ||
      (totalReviewCount && !(Number.isFinite(averageRating) && averageRating >= 1 && averageRating <= 5))) {
    throw new Error('Google ha devuelto una valoración inválida.');
  }
  return { totalReviewCount, averageRating: totalReviewCount ? averageRating : null, updatedAt: Date.now() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const summary = await readSummary(process.env);
    await appendFile('_site/web-content.js', '\nwindow.DEV3D_GOOGLE_SUMMARY = ' + JSON.stringify(summary) + ';\n');
  } catch (error) {
    // Network errors can contain the private request URL. Log only a generic warning.
    console.error('No se ha podido actualizar la valoración. Comprueba los secretos y la autorización de Google.');
    process.exitCode = 1;
  }
}

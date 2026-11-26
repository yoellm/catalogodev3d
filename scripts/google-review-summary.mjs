import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

class ReviewError extends Error {}

export async function readSummary(env, request = fetch) {
  const keys = ['GOOGLE_REVIEWS_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
  const missing = keys.filter(key => !env[key]?.trim());
  if (missing.length) throw new ReviewError('Faltan secretos de Actions: ' + missing.join(', '));
  let url;
  try { url = new URL(env.GOOGLE_REVIEWS_URL.trim()); }
  catch { throw new ReviewError('GOOGLE_REVIEWS_URL debe contener solo la dirección de reseñas.'); }
  if (url.origin !== 'https://mybusiness.googleapis.com' || url.username || url.password ||
      !/^\/v4\/accounts\/\d+\/locations\/\d+\/reviews$/.test(url.pathname)) {
    throw new ReviewError('Comprueba GOOGLE_REVIEWS_URL.');
  }
  url.search = new URLSearchParams({ fields: 'averageRating,totalReviewCount', pageSize: '1' });
  const token = await request('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({
      grant_type: 'refresh_token', client_id: env.GOOGLE_CLIENT_ID.trim(),
      client_secret: env.GOOGLE_CLIENT_SECRET.trim(), refresh_token: env.GOOGLE_REFRESH_TOKEN.trim()
    })
  });
  if (!token.ok) {
    const { error } = await token.json().catch(() => ({}));
    if (error === 'invalid_grant') throw new ReviewError('OAuth invalid_grant: renueva GOOGLE_REFRESH_TOKEN con el mismo cliente.');
    if (error === 'invalid_client') throw new ReviewError('OAuth invalid_client: revisa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.');
    throw new ReviewError('Google ha rechazado la renovación OAuth (HTTP ' + token.status + ').');
  }
  const { access_token } = await token.json();
  if (!access_token) throw new ReviewError('Falta el token de acceso.');
  const response = await request(url, {
    headers: { Authorization: 'Bearer ' + access_token }, redirect: 'error', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new ReviewError('Consulta de reseñas fallida (HTTP ' + response.status + ').');
  const { totalReviewCount = 0, averageRating } = await response.json();
  if (!Number.isSafeInteger(totalReviewCount) || totalReviewCount < 0 ||
      (totalReviewCount && !(Number.isFinite(averageRating) && averageRating >= 1 && averageRating <= 5))) {
    throw new ReviewError('Google ha devuelto una valoración inválida.');
  }
  return { totalReviewCount, averageRating: totalReviewCount ? averageRating : null, updatedAt: Date.now() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const summary = await readSummary(process.env);
    await appendFile('_site/web-content.js', '\nwindow.DEV3D_GOOGLE_SUMMARY = ' + JSON.stringify(summary) + ';\n');
  } catch (error) {
    const message = error instanceof ReviewError ? error.message : 'Error de conexión, respuesta o escritura al actualizar la valoración.';
    console.error('::warning title=Valoración de Google::' + message);
    process.exitCode = 1;
  }
}

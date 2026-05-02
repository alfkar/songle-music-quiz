
import { generateRandomString, generateCodeChallenge } from '../../lib/pcke'; // Re-use PKCE logic
import { getRedirectUri } from '../../lib/redirectUri';
import { serialize } from 'cookie';

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const AUTHORIZATION_ENDPOINT = process.env.NEXT_PUBLIC_SPOTIFY_AUTHORIZATION_ENDPOINT;
const SCOPE = 'streaming \
              user-read-private \
              user-read-email \
              playlist-read-private \
              playlist-read-collaborative \
              user-modify-playback-state';

export default async function handler(req, res) {
  const redirectUri = getRedirectUri(req);
  const nextPath =
    typeof req.query.next === 'string' &&
    req.query.next.startsWith('/') &&
    !req.query.next.startsWith('//')
      ? req.query.next
      : '/';

  const code_verifier = generateRandomString(64);
  const code_challenge = await generateCodeChallenge(code_verifier);

  res.setHeader('Set-Cookie', [
    serialize('spotify_code_verifier', code_verifier, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300,
    }),
    serialize('spotify_login_next', nextPath, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300,
    }),
  ]); 

  
  const authUrl = new URL(AUTHORIZATION_ENDPOINT);
  const params = {
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: code_challenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  res.redirect(authUrl.toString());
}

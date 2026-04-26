const crypto = require('crypto');

const AUTH_COOKIE_NAME = 'strategy_league_auth';
const AUTH_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getAuthSecret(){
  return process.env.AUTH_SECRET || 'strategy-league-local-secret';
}

function parseCookieHeader(header){
  return String(header || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, chunk) => {
      const separatorIndex = chunk.indexOf('=');
      if(separatorIndex <= 0) return cookies;
      const key = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function signTokenPayload(encodedPayload){
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function createAuthToken(user){
  const payload = {
    sub: String(user._id || user.id || ''),
    username: user.username,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
    exp: Date.now() + AUTH_TTL_MS
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signTokenPayload(encodedPayload)}`;
}

function verifyAuthToken(token){
  if(typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if(!encodedPayload || !signature) return null;

  const expectedSignature = signTokenPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if(
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ){
    return null;
  }

  try{
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if(!payload?.username || !payload?.exp || payload.exp < Date.now()){
      return null;
    }
    return payload;
  }catch(_err){
    return null;
  }
}

function getAuthTokenFromRequest(req){
  const cookies = parseCookieHeader(req?.headers?.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function getAuthUserFromRequest(req){
  return verifyAuthToken(getAuthTokenFromRequest(req));
}

function attachAuthUser(req, _res, next){
  req.authUser = getAuthUserFromRequest(req);
  next();
}

function authCookieHeader(token){
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(AUTH_TTL_MS / 1000)}`;
}

function clearAuthCookieHeader(){
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  AUTH_COOKIE_NAME,
  attachAuthUser,
  authCookieHeader,
  clearAuthCookieHeader,
  createAuthToken,
  getAuthTokenFromRequest,
  getAuthUserFromRequest,
  parseCookieHeader,
  verifyAuthToken
};

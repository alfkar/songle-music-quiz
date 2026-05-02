export function getRedirectUri(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const hostText = String(host || "");
  const isLocalHost =
    hostText.includes("127.0.0.1") ||
    hostText.includes("localhost") ||
    hostText.includes("[::1]");
  const configuredRedirectUri =
    process.env.SPOTIFY_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_REDIRECT_URI;
  const publicRedirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const configuredAppUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (isLocalHost) {
    if (
      publicRedirectUri?.includes("127.0.0.1") ||
      publicRedirectUri?.includes("localhost")
    ) {
      return publicRedirectUri;
    }

    return `http://${hostText}/api/callback`;
  }

  if (configuredRedirectUri?.startsWith("https://")) {
    return configuredRedirectUri;
  }

  if (configuredAppUrl?.startsWith("https://")) {
    return `${configuredAppUrl.replace(/\/$/, "")}/api/callback`;
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";

  if (host) {
    return `${protocol}://${host}/api/callback`;
  }

  return configuredRedirectUri;
}

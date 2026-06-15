export const QUIZ_CATALOG_CACHE_PREFIX = "quiz-catalog:";

export function pruneQuizCatalogCache(currentCacheKey) {
  if (typeof localStorage === "undefined") return;

  const catalogKeys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(QUIZ_CATALOG_CACHE_PREFIX) && key !== currentCacheKey) {
      catalogKeys.push(key);
    }
  }

  catalogKeys.forEach((key) => localStorage.removeItem(key));
}

export function readCachedQuizCatalog(cacheKey) {
  if (typeof localStorage === "undefined") return null;

  try {
    const cachedCatalog = localStorage.getItem(cacheKey);
    return cachedCatalog ? JSON.parse(cachedCatalog) : null;
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
}

export function writeCachedQuizCatalog(cacheKey, catalog) {
  if (typeof localStorage === "undefined") return;

  const serializedCatalog = JSON.stringify(catalog);

  try {
    localStorage.setItem(cacheKey, serializedCatalog);
  } catch (error) {
    pruneQuizCatalogCache(cacheKey);

    try {
      localStorage.setItem(cacheKey, serializedCatalog);
    } catch (retryError) {
      console.warn("Could not cache quiz catalog.", retryError || error);
    }
  }
}

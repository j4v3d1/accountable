const SCHEME = /^https?:\/\//i;

/** A website as a link: as typed when it has http:// or https://, otherwise with https:// added. */
export function websiteHref(website: string): string {
  return SCHEME.test(website) ? website : `https://${website}`;
}

/** A website as shown in tables and on the record page, without the scheme or a trailing slash. */
export function displayWebsite(website: string): string {
  return website.replace(SCHEME, "").replace(/\/$/, "");
}

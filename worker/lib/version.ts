/** Canonical product version — single source of truth for Worker + panel. */

export const XRayMOD_VERSION = '1.9.12';
/** Schema soft-migration level stored in kvstore `schema.version`. */
export const XRayMOD_SCHEMA_VERSION = '5';
/** Optional build/channel stamp (rolling vs release). Workers-safe — no Node `process`. */
export const XRayMOD_BUILD = 'release';

export function versionBanner(): string {
  return `XRayMOD ${XRayMOD_VERSION} (${XRayMOD_BUILD})`;
}

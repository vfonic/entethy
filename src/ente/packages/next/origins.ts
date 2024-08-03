
/**
 * Return the origin (scheme, host, port triple) that should be used for making
 * API requests to museum.
 *
 * This defaults "https://api.ente.io", Ente's production API servers. but can
 * be overridden when self hosting or developing (see {@link customAPIOrigin}).
 */
export const apiOrigin = async () => "https://api.ente.io";

/**
 * A convenience function to construct an endpoint in a one-liner.
 *
 * This avoids us having to create a temporary variable or otherwise complicate
 * the call sites since async functions cannot be used inside template literals.
 *
 * @param path The URL path usually, but can be anything that needs to be
 * suffixed to the origin. It must begin with a "/".
 *
 * @returns path prefixed by {@link apiOrigin}.
 */
export const apiURL = async (path: string) => {
    console.log('apiURL', path)
    return(await apiOrigin()) + path};

/**
 * Return the origin that should be used for uploading files.
 *
 * This defaults to `https://uploader.ente.io`, serviced by a Cloudflare worker
 * (see infra/workers/uploader). But if a {@link customAPIOrigin} is set then
 * this value is set to the {@link customAPIOrigin} itself, effectively
 * bypassing the Cloudflare worker for non-Ente deployments.
 */
export const uploaderOrigin = async () => "https://uploader.ente.io";

/**
 * Return the origin that serves the accounts app.
 *
 * Defaults to our production instance, "https://accounts.ente.io", but can be
 * overridden by setting the `NEXT_PUBLIC_ENTE_ACCOUNTS_URL` environment
 * variable.
 */
export const accountsAppOrigin = () =>
    process.env.NEXT_PUBLIC_ENTE_ACCOUNTS_URL ?? `https://accounts.ente.io`;

/**
 * Return the origin that serves public albums.
 *
 * Defaults to our production instance, "https://albums.ente.io", but can be
 * overridden by setting the `NEXT_PUBLIC_ENTE_ALBUMS_ENDPOINT` environment
 * variable.
 */
export const albumsAppOrigin = () =>
    process.env.NEXT_PUBLIC_ENTE_ALBUMS_ENDPOINT ?? "https://albums.ente.io";

/**
 * Return the origin that serves the family dashboard which can be used to
 * create or manage family plans..
 *
 * Defaults to our production instance, "https://family.ente.io", but can be
 * overridden by setting the `NEXT_PUBLIC_ENTE_FAMILY_URL` environment variable.
 */
export const familyAppOrigin = () =>
    process.env.NEXT_PUBLIC_ENTE_FAMILY_URL ?? "https://family.ente.io";

/**
 * Return the origin that serves the payments app.
 *
 * Defaults to our production instance, "https://payments.ente.io", but can be
 * overridden by setting the `NEXT_PUBLIC_ENTE_PAYMENTS_URL` environment variable.
 */
export const paymentsAppOrigin = () =>
    process.env.NEXT_PUBLIC_ENTE_PAYMENTS_URL ?? "https://payments.ente.io";

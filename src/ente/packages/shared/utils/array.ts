/**
 * Merge the given array of {@link Uint8Array}s in order into a single
 * {@link Uint8Array}.
 *
 * @param as An array of {@link Uint8Array}.
 */
export const mergeUint8Arrays = (as: Uint8Array[]) => {
    // A longer but better performing replacement of
    //
    //     new Uint8Array(as.reduce((acc, x) => acc.concat(...x), []))
    //

    const len = as.reduce((len, xs) => len + xs.length, 0);
    const result = new Uint8Array(len);
    as.reduce((n, xs) => (result.set(xs, n), n + xs.length), 0);
    return result;
};

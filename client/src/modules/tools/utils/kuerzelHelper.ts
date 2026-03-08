/**
 * Pure string-utility helpers for the Kürzel finder.
 * No Vue dependencies — safe to unit-test independently.
 */

/** Lowercase, collapse whitespace, and fold German umlauts. */
export function normalize(str: string): string {
    return str
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
}

/** Levenshtein edit-distance between two strings. */
export function editDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length

    // Use a flat 1-D array instead of a matrix for better cache efficiency
    const dp: number[] = Array.from({ length: (m + 1) * (n + 1) }, (_, k) => {
        const i = Math.floor(k / (n + 1))
        const j = k % (n + 1)
        if (i === 0) return j
        if (j === 0) return i
        return 0
    })

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i * (n + 1) + j] =
                a[i - 1] === b[j - 1]
                    ? dp[(i - 1) * (n + 1) + (j - 1)]
                    : 1 + Math.min(
                    dp[(i - 1) * (n + 1) + j],    // delete
                    dp[i * (n + 1) + (j - 1)],    // insert
                    dp[(i - 1) * (n + 1) + (j - 1)] // replace
                )
        }
    }

    return dp[m * (n + 1) + n]
}

/** Similarity score in [0, 1] between two strings (1 = identical). */
export function similarity(a: string, b: string): number {
    const longer = a.length >= b.length ? a : b
    const shorter = a.length >= b.length ? b : a
    if (longer.length === 0) return 1
    return (longer.length - editDistance(longer, shorter)) / longer.length
}
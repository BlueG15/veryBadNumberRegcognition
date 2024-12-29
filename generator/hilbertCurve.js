function* hilbertCurve(size = 32) {
    /**
     * Generator function for the Hilbert curve coordinates of a 2D grid.
     * @param {number} size - The size of the 2D grid. Must be a power of 2.
     * @yields {Array<number>} [x, y] coordinates on the grid.
     */
    // if ((size & (size - 1)) !== 0) {
    //     throw new Error("Size must be a power of 2");
    // }

    const numPoints = size * size;

    function hilbertIndexToPoint(index, n) {
        let x = 0, y = 0;
        for (let s = 0; (1 << s) < n; s++) {
            const rx = 1 & (index >> (2 * s + 1));
            const ry = 1 & (index >> (2 * s));

            if (rx === 0) {
                if (ry === 1) {
                    // Rotate clockwise
                    [x, y] = [y, x];
                } else {
                    // Rotate counterclockwise
                    [x, y] = [y ^ (1 << s), x ^ (1 << s)];
                }
            }

            x += rx << s;
            y += ry << s;
        }
        return [x, y];
    }

    for (let i = 0; i < numPoints; i++) {
        yield hilbertIndexToPoint(i, size);
    }
}

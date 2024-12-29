function* zOrderCurve(size = 32) {
    //const numPoints = size * size;

    function interleaveBits(x, y) {
        let result = 0;
        for (let i = 0; i < 16; i++) {
            result |= ((x >> i) & 1) << (2 * i);
            result |= ((y >> i) & 1) << (2 * i + 1);
        }
        return result;
    }

    const points = [];
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            points.push({ x, y, key: interleaveBits(x, y) });
        }
    }
    points.sort((a, b) => a.key - b.key);

    for (const point of points) {
        yield [point.x, point.y];
    }
}


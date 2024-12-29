function* snakeCurve(size = 32) {
    for (let y = 0; y < size; y++) {
        if (y % 2 === 0) {
            // Move left-to-right on even rows
            for (let x = 0; x < size; x++) {
                yield [x, y];
            }
        } else {
            // Move right-to-left on odd rows
            for (let x = size - 1; x >= 0; x--) {
                yield [x, y];
            }
        }
    }
}


function* spiralCurve(size = 32) {
    /**
     * Generator function for a spiral curve visiting every square in a grid.
     * @param {number} size - The size of the grid (assumes a square grid).
     * @yields {Array<number>} [x, y] coordinates on the grid.
     */
    let left = 0,
        right = size - 1,
        top = 0,
        bottom = size - 1;

    while (left <= right && top <= bottom) {
        // Move right across the top row
        for (let x = left; x <= right; x++) {
            yield [x, top];
        }
        top++;

        // Move down the right column
        for (let y = top; y <= bottom; y++) {
            yield [right, y];
        }
        right--;

        // Move left across the bottom row
        if (top <= bottom) {
            for (let x = right; x >= left; x--) {
                yield [x, bottom];
            }
            bottom--;
        }

        // Move up the left column
        if (left <= right) {
            for (let y = bottom; y >= top; y--) {
                yield [left, y];
            }
            left++;
        }
    }
}


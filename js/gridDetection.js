const MAX_DIMENSION = 10;

function luminance(data, offset) {
    return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
}

function buildEdgeProjection(data, width, height, vertical) {
    const length = vertical ? width : height;
    const crossLength = vertical ? height : width;
    const scores = new Float64Array(length);

    for (let position = 1; position < length - 1; position += 1) {
        let total = 0;
        for (let cross = 0; cross < crossLength; cross += 1) {
            const before = vertical
                ? (cross * width + position - 1) * 4
                : ((position - 1) * width + cross) * 4;
            const after = vertical
                ? (cross * width + position) * 4
                : (position * width + cross) * 4;
            total += Math.abs(luminance(data, before) - luminance(data, after));
        }
        scores[position] = total / crossLength;
    }

    // Smooth over a few pixels so thick borders and gutters are still detected.
    const smoothed = new Float64Array(length);
    for (let i = 1; i < length - 1; i += 1) {
        smoothed[i] = Math.max(
            scores[i],
            (scores[i - 1] + scores[i] + scores[i + 1]) / 3
        );
    }
    return smoothed;
}

function estimateDimension(scores) {
    const length = scores.length;
    let baseline = 0;
    for (let i = 2; i < length - 2; i += 1) baseline += scores[i];
    baseline /= Math.max(1, length - 4);
    if (baseline < 1) return 1;

    let bestDimension = 1;
    let bestScore = 0;

    for (let dimension = 2; dimension <= MAX_DIMENSION; dimension += 1) {
        const searchRadius = Math.max(2, Math.floor(length * 0.018));
        let boundaryTotal = 0;

        for (let boundary = 1; boundary < dimension; boundary += 1) {
            const expected = Math.round(length * boundary / dimension);
            let peak = 0;
            for (let offset = -searchRadius; offset <= searchRadius; offset += 1) {
                const position = expected + offset;
                if (position > 0 && position < length - 1) {
                    peak = Math.max(peak, scores[position]);
                }
            }
            boundaryTotal += peak;
        }

        const contrast = boundaryTotal / (dimension - 1) / baseline;
        const score = contrast - (dimension - 1) * 0.28;
        if (score > bestScore) {
            bestScore = score;
            bestDimension = dimension;
        }
    }

    // Avoid claiming a grid when no regular separators stand out from the image.
    return bestScore >= 1.45 ? bestDimension : 1;
}

export function detectGridDimensions(imageData, width, height) {
    if (!imageData || !Number.isInteger(width) || !Number.isInteger(height) ||
        width < 2 || height < 2 || imageData.length < width * height * 4) {
        throw new TypeError("A valid image pixel buffer and dimensions are required.");
    }

    const verticalEdges = buildEdgeProjection(imageData, width, height, true);
    const horizontalEdges = buildEdgeProjection(imageData, width, height, false);

    return {
        rows: estimateDimension(horizontalEdges),
        columns: estimateDimension(verticalEdges)
    };
}

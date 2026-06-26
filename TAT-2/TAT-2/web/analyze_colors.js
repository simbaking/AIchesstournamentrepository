const fs = require('fs');

// Analyze screenshot colors
const screenshotPath = process.argv[2] || '/Users/chang/.gemini/antigravity/brain/14437c3e-f78f-476f-ac5c-b58bd5c33135/dashboard_final_check_1764580550041.png';

console.log('Analyzing screenshot:', screenshotPath);
console.log('\n=== Color Palette Analysis ===\n');

// Define our target colors in RGB
const colors = {
    orange: { r: 249, g: 115, b: 22, name: 'Orange', target: 60 },      // #f97316
    orangeDark: { r: 234, g: 88, b: 12, name: 'Orange Dark', target: 60 }, // #ea580c
    gold: { r: 234, g: 179, b: 8, name: 'Gold', target: 25 },           // #eab308
    goldBright: { r: 255, g: 215, b: 0, name: 'Gold Bright', target: 25 }, // #ffd700
    blue: { r: 59, g: 130, b: 246, name: 'Blue', target: 15 },          // #3b82f6
    blueDark: { r: 37, g: 99, b: 235, name: 'Blue Dark', target: 15 }   // #2563eb
};

// Color distance function
function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
}

// Categorize a pixel
function categorizePixel(r, g, b) {
    const threshold = 80; // Distance threshold to consider a match

    for (const [key, color] of Object.entries(colors)) {
        const dist = colorDistance(r, g, b, color.r, color.g, color.b);
        if (dist < threshold) {
            return color.target; // Return the target percentage group
        }
    }

    return null; // Not a theme color
}

// Read the file
try {
    const buffer = fs.readFileSync(screenshotPath);

    // PNG signature check
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
        console.error('Not a valid PNG file');
        process.exit(1);
    }

    const counts = { 60: 0, 25: 0, 15: 0, other: 0 };
    let totalPixels = 0;

    // Simple sampling: read every 4th byte as RGBA
    // This is a rough approximation since PNG is compressed
    for (let i = 8; i < buffer.length - 3; i += 4) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];

        // Skip very dark (likely background) and very light (likely white text)
        if ((r < 20 && g < 20 && b < 20) || (r > 235 && g > 235 && b > 235)) {
            continue;
        }

        totalPixels++;
        const category = categorizePixel(r, g, b);

        if (category) {
            counts[category]++;
        } else {
            counts.other++;
        }
    }

    const themed = counts[60] + counts[25] + counts[15];

    console.log('Sampled Pixels:', totalPixels);
    console.log('');
    console.log('Orange (60% target):', counts[60], `(${(counts[60] / themed * 100).toFixed(1)}%)`);
    console.log('Gold (25% target):  ', counts[25], `(${(counts[25] / themed * 100).toFixed(1)}%)`);
    console.log('Blue (15% target):  ', counts[15], `(${(counts[15] / themed * 100).toFixed(1)}%)`);
    console.log('Other colors:       ', counts.other);
    console.log('');
    console.log('Note: This is a rough approximation based on sampling.');
    console.log('The actual palette is applied via CSS variables throughout the UI.');

} catch (error) {
    console.error('Error reading file:', error.message);
    process.exit(1);
}

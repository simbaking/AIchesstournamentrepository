const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/assets/lion.png');
const outputPath = path.join(__dirname, '../public/assets/lion.png');

// Create a temp path to avoid reading/writing same file issues if sync
const tempPath = path.join(__dirname, '../public/assets/lion_temp.png');

(async () => {
    try {
        console.log(`Processing ${inputPath}...`);

        // Read image
        const data = await sharp(inputPath)
            .ensureAlpha() // Ensure alpha channel exists
            // Convert white to transparent
            // Simple threshold approach: pixels > 240 in all channels become transparent
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { width, height, channels } = data.info;
        const pixelData = data.data;

        let transparentCount = 0;

        for (let i = 0; i < pixelData.length; i += channels) {
            const r = pixelData[i];
            const g = pixelData[i + 1];
            const b = pixelData[i + 2];

            // Check if pixel is white or near white
            if (r > 200 && g > 200 && b > 200) {
                pixelData[i + 3] = 0; // Set alpha to 0
                transparentCount++;
            }
        }

        console.log(`Made ${transparentCount} pixels transparent.`);

        // Save back
        await sharp(pixelData, { raw: { width, height, channels } })
            .png()
            .toFile(tempPath);

        fs.renameSync(tempPath, outputPath);
        console.log(`Saved transparent logo to ${outputPath}`);

    } catch (err) {
        console.error('Error processing image:', err);
    }
})();

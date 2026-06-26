const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = path.join(__dirname, '../public/assets/lion_inter.png');
const outputPath = path.join(__dirname, '../public/assets/lion.png');

fs.createReadStream(inputPath)
    .pipe(new PNG())
    .on('parsed', function () {
        console.log(`Processing ${inputPath} with size ${this.width}x${this.height}`);
        let transparentCount = 0;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (this.width * y + x) << 2;

                const r = this.data[idx];
                const g = this.data[idx + 1];
                const b = this.data[idx + 2];

                // Threshold for "white"
                if (r > 200 && g > 200 && b > 200) {
                    this.data[idx + 3] = 0; // Alpha = 0
                    transparentCount++;
                }
            }
        }

        console.log(`Made ${transparentCount} pixels transparent.`);

        this.pack().pipe(fs.createWriteStream(outputPath))
            .on('finish', () => console.log('Image saved successfully.'));
    })
    .on('error', (err) => console.error('Error:', err));

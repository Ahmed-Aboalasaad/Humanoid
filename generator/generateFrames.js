const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const colors = [
  { name: "red", hex: "red" },
  { name: "green", hex: "green" },
  { name: "white", hex: "white" },
  { name: "black", hex: "black" },
];

let frameCount = 0;

const outputDir = path.join(__dirname, "frames");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function generateFrame() {
  const color = colors[frameCount % colors.length];
  const outputPath = path.join(
    outputDir,
    `frame_${frameCount.toString().padStart(4, "0")}.png`
  );
  const cmd = `ffmpeg -y -f lavfi -i color=${color.hex}:s=500x500:d=2 -frames:v 1 "${outputPath}"`;

  console.log(`Generating: ${outputPath}`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error generating frame: ${error.message}`);
      return;
    }
    frameCount++;
    setTimeout(generateFrame, 100); // Wait 2 seconds before generating the next frame
  });
}

generateFrame();

import path from "path";
import fs from "fs";
import sharp from "sharp";
import chalk from "chalk";
import cliProgress from "cli-progress";

// Get input/output directories from command-line arguments or use defaults
const inputDir = process.argv[2] || "./target";
const outputDir = process.argv[3] || "./output";

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to recursively get all image files from nested directories
const getAllImageFiles = (dirPath, filesArray = []) => {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      getAllImageFiles(filePath, filesArray);
    } else if (/\.(png|jpg|jpeg)$/i.test(file.name)) {
      filesArray.push(filePath);
    }
  });

  return filesArray;
};

const convertToWebP = async (filePath, outputFilePath) => {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let transformer = image;

    // Only resize if width or height is greater than 2000
    if (metadata.width > 2000 || metadata.height > 2000) {
      transformer = transformer.resize({
        width: metadata.width > 2000 ? 2000 : undefined,
        height: metadata.height > 2000 ? 2000 : undefined,
        fit: "inside", // maintain aspect ratio, fit within 2000x2000
      });
    }

    await transformer.webp({ quality: 90 }).toFile(outputFilePath);
    return true;
  } catch (err) {
    console.error(
      chalk.red("Error optimizing " + filePath + ":"),
      chalk.gray(err.message)
    );
    return false;
  }
};

// Function to bulk optimize images
const optimizeImages = async () => {
  const imageFiles = getAllImageFiles(inputDir);

  if (imageFiles.length === 0) {
    console.log(chalk.yellow("No image files found!"));
    return;
  }

  console.log(
    chalk.cyan(
      `Found ${imageFiles.length} image file(s) in ${inputDir}`
    )
  );

  // Set up progress bar
  const bar = new cliProgress.SingleBar(
    {
      format:
        chalk.green("Progress") +
        " |" +
        chalk.cyan("{bar}") +
        "| {percentage}% || {value}/{total} Images",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar.start(imageFiles.length, 0);

  let successCount = 0;

  for (const filePath of imageFiles) {
    const relativePath = path.relative(inputDir, filePath);
    const outputFilePath = path.join(
      outputDir,
      relativePath.replace(/\.(png|jpg|jpeg)$/i, ".webp")
    );

    // Ensure output directory exists for nested files
    const outputDirPath = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    const success = await convertToWebP(filePath, outputFilePath);
    if (success) {
      successCount++;
    }
    bar.increment();
  }

  bar.stop();

  if (successCount === imageFiles.length) {
    console.log(
      chalk.green.bold("All images optimized successfully! 🎉")
    );
  } else {
    console.log(
      chalk.yellow(
        `Optimized ${successCount} out of ${imageFiles.length} images.`
      )
    );
  }
};

// Run the optimization
console.log(
  chalk.blue.bold("Starting image optimization...\n")
);
optimizeImages();

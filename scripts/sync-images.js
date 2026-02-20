import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STYLES_DIR = path.join(__dirname, '../assets/flower_styles');
const OUTPUT_FILE = path.join(__dirname, '../web/src/generatedStyles.ts');

function formatLabel(filename) {
  // Strip extensions and weird codes (like F-F38VMJ_LOL_preset...) just to make a somewhat readable label
  // For a real app, maybe pick random pretty names, but here we can just use generic beautiful names
  const prettyNames = ['Bright Vibes', 'Classic Love', 'Wild Meadow', 'Spring Pastels', 'Elegant Orchids', 'Lush Peonies', 'Tropical Mix', 'Soft Pastel'];
  return prettyNames[Math.floor(Math.random() * prettyNames.length)];
}

function scanDirectories() {
  const folders = fs.readdirSync(STYLES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const collections = {};
  let allStyles = [];
  let idCounter = 1;

  for (const folder of folders) {
    const folderPath = path.join(STYLES_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.match(/\.(jpg|jpeg|png|webp|avif)$/i));
    
    const folderStyles = files.map(file => {
      const styleObj = {
        id: `img_${idCounter++}`,
        label: formatLabel(file),
        image: `./flower_styles/${folder}/${file}`
      };
      allStyles.push(styleObj);
      return styleObj;
    });

    collections[folder] = folderStyles;
  }

  // Generate the TypeScript code
  const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Run \`node scripts/sync-images.js\` to update

export type FlowerStyle = { id: string; label: string; image: string };

export const FOLDER_COLLECTIONS: Record<string, FlowerStyle[]> = ${JSON.stringify(collections, null, 2)};

export const ALL_STYLES: FlowerStyle[] = ${JSON.stringify(allStyles, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
  console.log(`[Sync Images] Successfully cataloged ${allStyles.length} images into generatedStyles.ts`);
}

scanDirectories();

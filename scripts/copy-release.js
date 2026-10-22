import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const releasesDir = path.join(rootDir, 'releases');
const targetDir = path.join(rootDir, 'src-tauri', 'target');

if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

console.log('🔍 Buscando binarios compilados en src-tauri/target...');

function findReleaseFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findReleaseFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.exe', '.msi', '.deb', '.appimage'].includes(ext)) {
        // Exclude intermediate build files
        if (!fullPath.includes('/deps/') && !fullPath.includes('/build/') && !fullPath.includes('/incremental/')) {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
}

const foundFiles = findReleaseFiles(targetDir);

if (foundFiles.length === 0) {
  console.log('⚠️  No se encontraron ejecutables en src-tauri/target.');
  console.log('💡 Asegúrate de haber ejecutado: npm run tauri:build');
  process.exit(0);
}

console.log(`📦 Encontrados ${foundFiles.length} archivo(s). Copiando a /releases...\n`);

for (const filePath of foundFiles) {
  const fileName = path.basename(filePath);
  const destPath = path.join(releasesDir, fileName);
  fs.copyFileSync(filePath, destPath);
  const sizeMb = (fs.statSync(destPath).size / (1024 * 1024)).toFixed(2);
  console.log(`  ✅ Copiado: releases/${fileName} (${sizeMb} MB)`);
}

console.log('\n🎉 ¡Archivos listos en la carpeta /releases para subir a GitHub Releases!');

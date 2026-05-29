const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const SOURCE_DIR = './extension';
const BUILD_DIR = './build';
const EXTENSION_NAME = 'AI Cutout Assistant';
const BUNDLE_ID = 'com.trae.photoshop-copilot';
const VERSION = '1.0.0';

async function createBuildDir() {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
}

async function copyExtensionFiles() {
  const destDir = path.join(BUILD_DIR, `${BUNDLE_ID}.ccx`);
  
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  
  fs.mkdirSync(destDir, { recursive: true });
  
  const files = [
    { src: 'manifest.xml', dest: 'manifest.xml' },
    { src: 'index.html', dest: 'index.html' },
    { src: 'css/style.css', dest: 'css/style.css' },
    { src: 'js/main.js', dest: 'js/main.js' },
    { src: 'jsx/photoshop-actions.jsx', dest: 'jsx/photoshop-actions.jsx' },
    { src: '../icon.png', dest: 'icon.png' }
  ];
  
  for (const file of files) {
    const srcPath = path.join(SOURCE_DIR, file.src);
    const destPath = path.join(destDir, file.dest);
    
    if (fs.existsSync(srcPath)) {
      const destFileDir = path.dirname(destPath);
      if (!fs.existsSync(destFileDir)) {
        fs.mkdirSync(destFileDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file.src}`);
    } else {
      console.warn(`File not found: ${srcPath}`);
    }
  }
}

async function createZIPPackage() {
  const sourceDir = path.join(BUILD_DIR, `${BUNDLE_ID}.ccx`);
  const zipPath = path.join(BUILD_DIR, `${BUNDLE_ID}-${VERSION}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });
    
    output.on('close', () => {
      console.log(`ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function buildPlugin() {
  console.log(`\n=== Building ${EXTENSION_NAME} v${VERSION} ===\n`);
  
  try {
    await createBuildDir();
    console.log('Created build directory');
    
    await copyExtensionFiles();
    console.log('\nCopied extension files');
    
    await createZIPPackage();
    console.log('\n=== Build completed successfully ===');
    console.log(`\nExtension location: ${path.join(BUILD_DIR, `${BUNDLE_ID}.ccx`)}`);
    console.log(`ZIP package: ${path.join(BUILD_DIR, `${BUNDLE_ID}-${VERSION}.zip`)}`);
    
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

buildPlugin();
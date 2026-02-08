const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
try {
    let swContent = fs.readFileSync(swPath, 'utf8');

    // Generate a unique version based on the current timestamp
    const timestamp = Date.now();
    const version = `v${timestamp}`;

    // Replace the hardcoded cache names with the new dynamic version
    let newContent = swContent.replace(
        /const CACHE_NAME = ".*";/,
        `const CACHE_NAME = "bullet-journal-${version}";`
    );

    newContent = newContent.replace(
        /const RUNTIME_CACHE = ".*";/,
        `const RUNTIME_CACHE = "bullet-journal-runtime-${version}";`
    );

    fs.writeFileSync(swPath, newContent);
    console.log(`✅ updated Service Worker cache version to: ${version}`);
} catch (error) {
    console.error("❌ Failed to update Service Worker version:", error);
    process.exit(1);
}

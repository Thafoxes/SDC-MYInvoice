const fs = require('node:fs');
fs.mkdirSync('.test-build', { recursive: true });
fs.writeFileSync('.test-build/package.json', '{"type":"commonjs"}\n');

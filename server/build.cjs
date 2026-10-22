const fs = require('node:fs');
fs.mkdirSync('.server-build', { recursive: true });
fs.writeFileSync('.server-build/package.json', '{"type":"commonjs"}\n');

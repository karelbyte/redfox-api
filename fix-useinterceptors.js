const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // If UseInterceptors is missing from @nestjs/common but is used as decorator
    if (content.includes('@UseInterceptors') && !content.includes('UseInterceptors,') && !content.includes(' UseInterceptors }')) {
        // Find the @nestjs/common import block
        const commonImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@nestjs\/common['"]/;
        const match = commonImportRegex.exec(content);

        if (match) {
            const imports = match[1];
            // Only add if not entirely already there
            if (!imports.includes('UseInterceptors')) {
                const newImports = imports + ', UseInterceptors';
                content = content.replace(commonImportRegex, `import {${newImports}} from '@nestjs/common'`);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Added UseInterceptors to:', path.basename(filePath));
            }
        }
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.controller.ts')) {
            processFile(fullPath);
        }
    }
}

scanDir(controllersDir);
console.log('Done fixing UseInterceptors imports.');

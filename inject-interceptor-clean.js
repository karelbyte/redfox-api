const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already applied
    if (content.includes('@UseInterceptors(TenantInterceptor)')) {
        console.log('Skipped (already has interceptor):', path.basename(filePath));
        return;
    }

    // --- Step 1: Add UseInterceptors to @nestjs/common import if not present ---
    if (!content.includes('UseInterceptors')) {
        // Find the @nestjs/common import block - it can be multiline
        // Match: import { ... } from '@nestjs/common';
        content = content.replace(
            /(from '@nestjs\/common';)/,
            // Insert UseInterceptors before the closing brace of the imports
            (match, p1, offset) => {
                // Find the opening { for this import backwards from 'from'
                const before = content.substring(0, offset);
                // Add UseInterceptors to the last item before '} from'
                return match; // We'll handle below
            }
        );

        // Simpler approach: find } from '@nestjs/common' and insert before }
        content = content.replace(/(})\s*from\s*'@nestjs\/common'/, ',\n  UseInterceptors,\n} from \'@nestjs/common\'');
    }

    // --- Step 2: Add the TenantInterceptor import statement ---
    // Find the end of the last import statement (the last line matching "from '...';" pattern)
    const lines = content.split('\n');
    let lastImportLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('} from ') || trimmed === '') {
            if (trimmed.startsWith('} from ') || (trimmed.startsWith('import ') && trimmed.endsWith(';'))) {
                lastImportLineIndex = i;
            }
        } else if (lastImportLineIndex >= 0 && !trimmed.startsWith('import') && !trimmed.startsWith('}') && trimmed !== '') {
            // We hit real code - stop
            break;
        }
    }

    // More reliable: find last occurrence of "from '..." followed by ';'
    let lastFromPos = -1;
    const fromRegex = /^.*from\s+['"].*['"];?\s*$/mg;
    let m;
    while ((m = fromRegex.exec(content)) !== null) {
        lastFromPos = m.index + m[0].length;
    }

    if (lastFromPos === -1) {
        console.log('Could not find import position for:', path.basename(filePath));
        return;
    }

    // Find the end of this line
    const nextNewline = content.indexOf('\n', lastFromPos - 1);
    const insertAt = nextNewline !== -1 ? nextNewline + 1 : lastFromPos;

    const importLine = "import { TenantInterceptor } from '../interceptors/tenant.interceptor';\n";
    content = content.slice(0, insertAt) + importLine + content.slice(insertAt);

    // --- Step 3: Add @UseInterceptors(TenantInterceptor) before @Controller ---
    content = content.replace(/^(@Controller\()/m, '@UseInterceptors(TenantInterceptor)\n$1');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', path.basename(filePath));
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.controller.ts')) {
            processFile(fullPath);
        }
    }
}

scanDir(controllersDir);
console.log('\nDone!');

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the previously incorrectly injected import statement
    content = content.replace(/import \{ TenantInterceptor \} from '\.\.\/interceptors\/tenant\.interceptor';\n?/g, '');

    // Find the proper place to insert the import: After the last line that ends a complete import statement.
    // A complete import statement usually ends with ';'. We look for the last import and its trailing semicolon.
    let insertionIndex = 0;
    const importRegex = /import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        insertionIndex = match.index + match[0].length;
    }

    if (insertionIndex > 0) {
        // Go to the end of that line
        const newLinePos = content.indexOf('\n', insertionIndex);
        if (newLinePos !== -1) {
            insertionIndex = newLinePos + 1;
        }
    }

    const importStatement = "import { TenantInterceptor } from '../interceptors/tenant.interceptor';\n";
    content = content.slice(0, insertionIndex) + importStatement + content.slice(insertionIndex);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed imports for:', path.basename(filePath));
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
console.log('Done fixing imports.');

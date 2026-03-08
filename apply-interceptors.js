const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already applied
    if (content.includes('@UseInterceptors(TenantInterceptor)')) {
        return;
    }

    // Find the latest import position
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;

    // Add import statement properly at the end of imports
    const importStatement = "import { TenantInterceptor } from '../interceptors/tenant.interceptor';\n";
    content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);

    // Make sure @UseInterceptors is placed exactly after @UseGuards
    // if using AuthGuard else place it before @Controller.
    if (content.includes('@UseGuards(')) {
        content = content.replace(/(@UseGuards\(.*?\))/g, '$1\n@UseInterceptors(TenantInterceptor)');
    } else {
        content = content.replace(/(@Controller\(.*?\))/g, '@UseInterceptors(TenantInterceptor)\n$1');
    }

    // Some endpoints may already have UseInterceptors inside @nestjs/common import block natively,
    // so let's import it up there if not exists.
    if (!content.includes('UseInterceptors') && content.includes('@nestjs/common')) {
        content = content.replace(/}\s*from\s*'@nestjs\/common'/g, '  UseInterceptors,\n} from \'@nestjs/common\'');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', path.basename(filePath));
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
console.log('Done.');

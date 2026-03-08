const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('TenantModule')) {
        return; // Already imported or provided
    }

    // Insert import at the top
    const importStatement = "import { TenantModule } from './tenant.module';\n";
    content = importStatement + content;

    // We need to inject `TenantModule` into the `imports: [...]` array of @Module
    const importsRegex = /imports:\s*\[([\s\S]*?)\]/m;
    const match = importsRegex.exec(content);

    if (match) {
        let importsArray = match[1];
        // Don't add if vaguely present
        if (!importsArray.includes('TenantModule')) {
            const newImports = importsArray.trim() === ''
                ? '\n    TenantModule,\n  '
                : importsArray + (importsArray.trim().endsWith(',') ? '' : ',') + '\n    TenantModule,';
            content = content.replace(importsRegex, `imports: [${newImports}]`);
        }
    } else {
        // If there's no imports array inside @Module, create one
        const moduleRegex = /@Module\({([\s\S]*?)}\)/m;
        const moduleMatch = moduleRegex.exec(content);

        if (moduleMatch) {
            const moduleBody = moduleMatch[1];
            content = content.replace(moduleRegex, `@Module({\n  imports: [TenantModule],${moduleBody}})`);
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added TenantModule to:', path.basename(filePath));
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (filePathShouldBeProcessed(fullPath)) {
            processFile(fullPath);
        }
    }
}

function filePathShouldBeProcessed(fullPath) {
    const filename = path.basename(fullPath);
    // Exclude tenant.module itself, and app.module.ts since it usually imports it globally
    if (filename === 'tenant.module.ts' || filename === 'app.module.ts') return false;
    return filename.endsWith('.module.ts');
}

scanDir(modulesDir);
console.log('Done injecting TenantModule dependencies.');

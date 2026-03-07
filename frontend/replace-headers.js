const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Pattern: headers['x-user-id'] = user.id
            content = content.replace(/headers\['x-user-id'\]\s*=\s*user\!?\.id/g, "headers['Authorization'] = `Bearer ${user?.token}`");

            // Pattern 1: { 'x-user-id': user.id } or { "x-user-id": user.id }
            content = content.replace(/['"]x-user-id['"]:\s*user!?\.id/g, "'Authorization': `Bearer ${user?.token}`");

            // Pattern 2: { 'x-user-id': user?.id }
            content = content.replace(/['"]x-user-id['"]:\s*user\?\.id/g, "'Authorization': `Bearer ${user?.token}`");

            // Pattern 3: { 'x-user-id': userId }
            content = content.replace(/['"]x-user-id['"]:\s*userId/g, "'Authorization': `Bearer ${userId}`"); // assuming userId might temporarily hold token if we don't have user object here, wait

            // Pattern 4: ...(userId ? { 'x-user-id': userId } : {})
            content = content.replace(/\.\.\.\(userId \? \{ ['"]x-user-id['"]: userId \} : \{\}\)/g, "...(userId ? { 'Authorization': `Bearer ${userId}` } : {})");


            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    });
}
processDir('src');

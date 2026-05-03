const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'src');

function findAndReplace(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findAndReplace(filePath);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            // Step 1: Replace window.location.hostname hardcoding first
            content = content.replace(/http:\/\/\$\{window\.location\.hostname\}:5001/g, "${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}");

            // Step 2: Replace all quoted/backticked occurrences of localhost:5001
            content = content.replace(/["'`]http:\/\/localhost:5001(.*?)["'`]/g, (match, restOfUrl) => {
                return `\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${restOfUrl}\``;
            });

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${filePath}`);
            }
        }
    });
}

console.log("Starting automatic URL replacement...");
findAndReplace(directoryPath);
console.log("Replacement complete!");

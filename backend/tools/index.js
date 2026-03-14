/**
 * Tool Plugin Registry — Auto-discovers all tool files in this directory.
 * 
 * HOW TO ADD A NEW TOOL:
 * 1. Create a new file in this directory (e.g., apply_coupon.js)
 * 2. Export the standard tool interface (see any existing tool for reference)
 * 3. Restart the backend — it will be automatically registered
 * 
 * Required exports per tool file:
 *   name: string               — unique tool identifier
 *   description: string        — description shown to the LLM
 *   parameters: object         — parameter schema (key: 'type - description')
 *   requiresConfirmation: bool — whether to prompt user before executing
 *   confirmationMessage: fn?   — (params) => string — custom confirmation prompt
 *   execute: async fn          — async ({ params, user, supabase }) => { text, ...data }
 */

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = __dirname;
const SKIP_FILES = ['index.js'];

// Auto-discover and load all tool files
const toolRegistry = new Map();

fs.readdirSync(TOOLS_DIR)
    .filter(f => f.endsWith('.js') && !SKIP_FILES.includes(f))
    .forEach(file => {
        try {
            const tool = require(path.join(TOOLS_DIR, file));
            if (tool.name && typeof tool.execute === 'function') {
                toolRegistry.set(tool.name, tool);
                console.log(`[Tools] Registered: ${tool.name}`);
            }
        } catch (err) {
            console.error(`[Tools] Failed to load ${file}:`, err.message);
        }
    });

console.log(`[Tools] Registry ready: ${toolRegistry.size} tools loaded`);

/**
 * Get all tools as an array
 */
const getAllTools = () => Array.from(toolRegistry.values());

/**
 * Get a specific tool by name
 */
const getTool = (name) => toolRegistry.get(name) || null;

/**
 * Build the system prompt tools section dynamically
 */
const buildToolsPrompt = () => {
    const tools = getAllTools();
    return tools.map(tool => {
        const params = Object.entries(tool.parameters || {})
            .map(([k, v]) => `    - ${k}: ${v}`)
            .join('\n');
        const confirmNote = tool.requiresConfirmation ? ' [REQUIRES USER CONFIRMATION]' : '';
        return `- **${tool.name}**${confirmNote}: ${tool.description}\n  Parameters:\n${params}`;
    }).join('\n\n');
};

module.exports = { getAllTools, getTool, buildToolsPrompt, toolRegistry };

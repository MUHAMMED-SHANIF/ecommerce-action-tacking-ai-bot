/**
 * Tool Plugin Registry — Auto-discovers all tool files by role.
 *
 * STRUCTURE:
 *   backend/tools/            ← Customer tools (role: 'user')
 *   backend/tools/seller/     ← Seller tools  (role: 'seller')
 *   backend/tools/admin/      ← Admin tools   (role: 'admin')
 *
 * HOW TO ADD A NEW TOOL:
 * 1. Create a new file in the correct role subfolder
 * 2. Export the standard tool interface (see any existing tool for reference)
 * 3. Restart the backend — it will be automatically registered
 *
 * Required exports per tool file:
 *   name: string               — unique tool identifier
 *   description: string        — description shown to the LLM
 *   parameters: object         — parameter schema (key: 'type - description')
 *   roles: string[]            — which roles can use this tool ['user','seller','admin']
 *   requiresConfirmation: bool — whether to prompt user before executing
 *   confirmationMessage: fn?   — (params) => string — custom confirmation prompt
 *   execute: async fn          — async ({ params, user, supabase }) => { text, ...data }
 */

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = __dirname;
const SKIP_FILES = ['index.js'];

// ─── Registry: Map of name → tool object ─────────────────────────
const toolRegistry = new Map();

// ─── Load customer tools from root tools/ directory ───────────────
fs.readdirSync(TOOLS_DIR)
    .filter(f => f.endsWith('.js') && !SKIP_FILES.includes(f) && fs.statSync(path.join(TOOLS_DIR, f)).isFile())
    .forEach(file => {
        try {
            const tool = require(path.join(TOOLS_DIR, file));
            if (tool.name && typeof tool.execute === 'function') {
                // Existing customer tools don't have 'roles' — default to ['user']
                if (!tool.roles) tool.roles = ['user'];
                toolRegistry.set(tool.name, tool);
                console.log(`[Tools] Registered (customer): ${tool.name}`);
            }
        } catch (err) {
            console.error(`[Tools] Failed to load ${file}:`, err.message);
        }
    });

// ─── Load seller tools from tools/seller/ ─────────────────────────
const SELLER_DIR = path.join(TOOLS_DIR, 'seller');
if (fs.existsSync(SELLER_DIR)) {
    fs.readdirSync(SELLER_DIR)
        .filter(f => f.endsWith('.js'))
        .forEach(file => {
            try {
                const tool = require(path.join(SELLER_DIR, file));
                if (tool.name && typeof tool.execute === 'function') {
                    if (!tool.roles) tool.roles = ['seller'];
                    toolRegistry.set(tool.name, tool);
                    console.log(`[Tools] Registered (seller): ${tool.name}`);
                }
            } catch (err) {
                console.error(`[Tools] Failed to load seller/${file}:`, err.message);
            }
        });
}

// ─── Load admin tools from tools/admin/ ───────────────────────────
const ADMIN_DIR = path.join(TOOLS_DIR, 'admin');
if (fs.existsSync(ADMIN_DIR)) {
    fs.readdirSync(ADMIN_DIR)
        .filter(f => f.endsWith('.js'))
        .forEach(file => {
            try {
                const tool = require(path.join(ADMIN_DIR, file));
                if (tool.name && typeof tool.execute === 'function') {
                    if (!tool.roles) tool.roles = ['admin'];
                    toolRegistry.set(tool.name, tool);
                    console.log(`[Tools] Registered (admin): ${tool.name}`);
                }
            } catch (err) {
                console.error(`[Tools] Failed to load admin/${file}:`, err.message);
            }
        });
}

console.log(`[Tools] Registry ready: ${toolRegistry.size} tools loaded`);

// ─── Accessors ────────────────────────────────────────────────────

/** Get all tools as an array */
const getAllTools = () => Array.from(toolRegistry.values());

/** Get a specific tool by name */
const getTool = (name) => toolRegistry.get(name) || null;

/** Get all tools available for a specific role */
const getToolsForRole = (role) => {
    return Array.from(toolRegistry.values()).filter(tool =>
        tool.roles && tool.roles.includes(role)
    );
};

/**
 * Build the system prompt tools section for ALL tools (legacy - customer only)
 * Kept for backward compatibility
 */
const buildToolsPrompt = () => {
    return buildToolsPromptForRole('user');
};

/**
 * Build the system prompt tools section for a specific role.
 * Only shows tools the AI for that role is allowed to use.
 */
const buildToolsPromptForRole = (role) => {
    const tools = getToolsForRole(role);
    if (tools.length === 0) {
        return `(No tools available for role: ${role})`;
    }
    return tools.map(tool => {
        const params = Object.entries(tool.parameters || {})
            .map(([k, v]) => `    - ${k}: ${v}`)
            .join('\n');
        const confirmNote = tool.requiresConfirmation ? ' [REQUIRES USER CONFIRMATION]' : '';
        return `- **${tool.name}**${confirmNote}: ${tool.description}\n  Parameters:\n${params || '    (none)'}`;
    }).join('\n\n');
};

module.exports = { getAllTools, getTool, getToolsForRole, buildToolsPrompt, buildToolsPromptForRole, toolRegistry };

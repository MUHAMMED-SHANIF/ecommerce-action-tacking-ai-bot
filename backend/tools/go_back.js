module.exports = {
    name: 'go_back',
    description: 'User wants to return to the previous page, go back, or undo navigation.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async () => {
        return { text: "Going back to the previous page.", success: true };
    }
};

module.exports = {
    name: 'navigate_home',
    description: 'User wants to go to the home page, main page, or start over.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async () => {
        return { text: "Taking you to the homepage now.", success: true };
    }
};

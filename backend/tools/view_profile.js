module.exports = {
    name: 'view_profile',
    description: 'User wants to open their account, show their profile, or view account settings.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async () => {
        return { text: "Opening your profile and account settings now.", success: true };
    }
};

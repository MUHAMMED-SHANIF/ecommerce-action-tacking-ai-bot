const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

console.log('admin:', hashPassword('admin'));
console.log('user:', hashPassword('user'));

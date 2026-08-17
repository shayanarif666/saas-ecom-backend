const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

const comparePassword = async (plain, hash) => {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
};

module.exports = { hashPassword, comparePassword };

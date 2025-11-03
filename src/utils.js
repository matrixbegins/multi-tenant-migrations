// src/utils.js

const crypto = require('crypto');

function generateSchemaName(clerkOrgId) {
  const hash = crypto.createHash('md5').update(clerkOrgId).digest('hex');
  return `tid_${hash.substring(0, 10)}`;
}

module.exports = {
  generateSchemaName
};


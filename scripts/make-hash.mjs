#!/usr/bin/env node
import bcrypt from 'bcryptjs';

const pass = process.argv[2] || '';
const email = process.argv[3] || '';
const name = process.argv[4] || '';
const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!pass || !email) {
  console.error('Usage: node scripts/make-hash.mjs <password> <email> [Name]');
  process.exit(1);
}

const hash = bcrypt.hashSync(pass, rounds);
console.log('BCRYPT_HASH=' + hash);

// Print example env var JSON
const obj = [{ email: email.toLowerCase(), hash, name }];
console.log('\nExample EMERGENCY_ADMINS (JSON) for .env or your platform:');
console.log("EMERGENCY_ADMINS='" + JSON.stringify(obj) + "'");

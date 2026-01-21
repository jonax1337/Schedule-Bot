import { generatePasswordHash } from './middleware/passwordManager.js';

const password = process.argv[2];

if (!password) {
  console.error('\n❌ Error: No password provided\n');
  console.log('Usage: node dist/generateHash.js YOUR_PASSWORD\n');
  process.exit(1);
}

if (password.length < 8) {
  console.error('\n❌ Error: Password must be at least 8 characters long\n');
  process.exit(1);
}

generatePasswordHash(password)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error generating hash:', error);
    process.exit(1);
  });

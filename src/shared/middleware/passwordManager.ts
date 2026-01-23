import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generatePasswordHash(plainPassword: string): Promise<void> {
  console.log('\n='.repeat(50));
  console.log('PASSWORD HASH GENERATOR');
  console.log('='.repeat(50));
  console.log('\nGenerating secure hash for password...\n');
  
  const hashedPassword = await hashPassword(plainPassword);
  
  console.log('✅ Hash generated successfully!\n');
  console.log('Add this to your .env file as ADMIN_PASSWORD_HASH:');
  console.log('-'.repeat(50));
  console.log(hashedPassword);
  console.log('-'.repeat(50));
  console.log('\nIMPORTANT: Remove ADMIN_PASSWORD from .env after setting ADMIN_PASSWORD_HASH\n');
}

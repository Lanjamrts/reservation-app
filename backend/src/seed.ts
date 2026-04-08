/**
 * Script de seed — Crée les utilisateurs initiaux dans MongoDB Atlas
 * Usage: npx ts-node src/seed.ts
 */
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
  },
  { timestamps: true, collection: 'users' },
);

const UserModel = mongoose.model('User', UserSchema);

const USERS_TO_SEED = [
  { username: 'admin',  password: 'admin123',  role: 'admin' },
  { username: 'alice',  password: 'alice123',  role: 'user'  },
  { username: 'bob',    password: 'bob123',    role: 'user'  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI non défini dans .env');
    process.exit(1);
  }

  console.log('🔗 Connexion à MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('✅ Connecté !');

  for (const userData of USERS_TO_SEED) {
    const existing = await UserModel.findOne({ username: userData.username });
    if (existing) {
      console.log(`⚠️  L'utilisateur "${userData.username}" existe déjà — ignoré`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await UserModel.create({ ...userData, password: hashedPassword });
    console.log(`✅ Utilisateur créé : ${userData.username} (${userData.role})`);
  }

  console.log('\n🎉 Seed terminé !');
  console.log('📋 Identifiants disponibles :');
  console.log('   admin  / admin123  (admin)');
  console.log('   alice  / alice123  (user)');
  console.log('   bob    / bob123    (user)');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'admin' | 'user';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Valider les credentials ───────────────────────────────────────────────
  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  // ─── Login → retourne JWT ──────────────────────────────────────────────────
  async login(username: string, password: string): Promise<{ access_token: string; user: object }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      },
    };
  }

  // ─── Trouver un utilisateur par ID ────────────────────────────────────────
  async findById(userId: string): Promise<object | null> {
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) return null;
    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
  }

  // ─── Créer un utilisateur (register) ──────────────────────────────────────
  async register(
    username: string,
    password: string,
    role: 'admin' | 'user' = 'user',
  ): Promise<object> {
    const existing = await this.userModel.findOne({ username }).exec();
    if (existing) {
      throw new ConflictException(`L'utilisateur "${username}" existe déjà`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      username,
      password: hashedPassword,
      role,
    });

    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
  }

  // ─── Lister tous les utilisateurs (admin) ─────────────────────────────────
  async findAll(): Promise<object[]> {
    const users = await this.userModel.find().select('-password').exec();
    return users.map((u) => ({
      userId: u._id.toString(),
      username: u.username,
      role: u.role,
    }));
  }

  // ─── Hasher un mot de passe (utilitaire) ──────────────────────────────────
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}
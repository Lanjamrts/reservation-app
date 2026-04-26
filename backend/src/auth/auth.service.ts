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
  email: string;
  role: 'admin' | 'user';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
  }

  async login(username: string, password: string): Promise<{ access_token: string; user: object }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async findById(userId: string): Promise<object | null> {
    const user = await this.userModel.findById(userId).select('-password').lean().exec();
    if (!user) return null;
    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
  }

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
    const user = await this.userModel.create({ username, password: hashedPassword, role });
    return {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
  }

  async findAll(): Promise<object[]> {
    const users = await this.userModel.find().select('-password').lean().exec();
    return users.map((u: any) => ({
      userId: u._id.toString(),
      username: u.username,
      role: u.role,
    }));
  }

  async getProfile(userId: string): Promise<object> {
    const user = await this.userModel.findById(userId).select('-password').lean().exec();
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return {
      userId: user._id.toString(),
      username: user.username,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      bio: user.bio || '',
      profileImage: user.profileImage || null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, updateData: any): Promise<object> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // ✅ Fix : utiliser !== undefined pour permettre les chaînes vides
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.bio !== undefined) user.bio = updateData.bio;
    if (updateData.profileImage !== undefined) user.profileImage = updateData.profileImage;

    user.updatedAt = new Date();
    await user.save();

    return {
      userId: user._id.toString(),
      username: user.username,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      bio: user.bio || '',
      profileImage: user.profileImage || null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}
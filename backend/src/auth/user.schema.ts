import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true })
  password: string; // stocké haché avec bcrypt

  @Prop({ required: false, trim: true })
  email?: string;

  @Prop({ required: false, trim: true })
  firstName?: string;

  @Prop({ required: false, trim: true })
  lastName?: string;

  @Prop({ required: false })
  profileImage?: string; // URL ou base64 de la photo

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, trim: true })
  bio?: string;

  @Prop({ required: true, enum: ['admin', 'user'], default: 'user' })
  role: 'admin' | 'user';

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

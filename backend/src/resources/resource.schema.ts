import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResourceDocument = Resource & Document;

export enum ResourceStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

@Schema({ timestamps: true })
export class Resource {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 10 })
  capacity: number;

  @Prop({ default: true })
  available: boolean;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ default: '' })
  rules: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: 0 })
  pricePerHour: number;

  @Prop({
    type: String,
    enum: ResourceStatus,
    default: ResourceStatus.AVAILABLE,
  })
  status: ResourceStatus;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
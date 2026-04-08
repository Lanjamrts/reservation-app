import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResourceDocument = Resource & Document;

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
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
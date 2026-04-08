import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resource, ResourceSchema } from './resource.schema';
import { ResourceController } from './resource.controller';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resource.name, schema: ResourceSchema }]),
    GatewayModule,
  ],
  controllers: [ResourceController],
  exports: [MongooseModule],
})
export class ResourcesModule {}
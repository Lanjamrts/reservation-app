import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from './resource.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AppGateway } from '../gateway/app.gateway';
import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

class CreateResourceDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsBoolean() available?: boolean;
}

class UpdateResourceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsBoolean() available?: boolean;
}

@Controller('resources')
export class ResourceController {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly appGateway: AppGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.resourceModel.find().sort({ createdAt: -1 }).exec();
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async findAvailable() {
    return this.resourceModel.find({ available: true }).sort({ createdAt: -1 }).exec();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateResourceDto) {
    const resource = await this.resourceModel.create(dto);
    // ✅ Broadcast temps réel à tous les users connectés
    this.appGateway.broadcastResourceUpdate({ event: 'resource:created', resource });
    return resource;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    const resource = await this.resourceModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    this.appGateway.broadcastResourceUpdate({ event: 'resource:updated', resource });
    return resource;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const resource = await this.resourceModel.findByIdAndDelete(id).exec();
    this.appGateway.broadcastResourceUpdate({ event: 'resource:deleted', resource });
    return { deleted: true };
  }
}
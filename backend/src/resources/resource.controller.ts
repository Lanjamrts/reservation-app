import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Query,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument, ResourceStatus } from './resource.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AppGateway } from '../gateway/app.gateway';
import {
  IsString, IsNumber, IsBoolean, IsOptional,
  IsNotEmpty, IsArray, IsEnum,
} from 'class-validator';

class CreateResourceDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsArray() amenities?: string[];
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() pricePerHour?: number;
  @IsOptional() @IsEnum(ResourceStatus) status?: ResourceStatus;
}

class UpdateResourceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsArray() amenities?: string[];
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() pricePerHour?: number;
  @IsOptional() @IsEnum(ResourceStatus) status?: ResourceStatus;
}

@Controller('resources')
export class ResourceController {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly appGateway: AppGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('status') status?: string) {
    const filter = status ? { status } : {};
    return this.resourceModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async findAvailable() {
    return this.resourceModel
      .find({ available: true, status: ResourceStatus.AVAILABLE })
      .sort({ createdAt: -1 })
      .exec();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStats() {
    const all = await this.resourceModel.find().exec();
    return {
      total: all.length,
      available: all.filter(r => r.status === ResourceStatus.AVAILABLE).length,
      reserved: all.filter(r => r.status === ResourceStatus.RESERVED).length,
      maintenance: all.filter(r => r.status === ResourceStatus.MAINTENANCE).length,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.resourceModel.findById(id).exec();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateResourceDto) {
    const resource = await this.resourceModel.create(dto);
    this.appGateway.broadcastResourceUpdate({ event: 'resource:created', resource });
    return resource;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    const resource = await this.resourceModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    this.appGateway.broadcastResourceUpdate({ event: 'resource:updated', resource });
    return resource;
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ResourceStatus,
  ) {
    const resource = await this.resourceModel
      .findByIdAndUpdate(id, { status, available: status === ResourceStatus.AVAILABLE }, { new: true })
      .exec();
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
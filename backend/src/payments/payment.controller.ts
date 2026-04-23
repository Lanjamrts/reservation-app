import {
  Controller, Get, Post, Patch,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentStatus, PaymentMethod } from './payment.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

class CreatePaymentDto {
  @IsString() bookingId: string;
  @IsString() resourceName: string;
  @IsNumber() amount: number;
  @IsOptional() @IsNumber() deposit?: number;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @IsOptional() @IsString() notes?: string;
}

class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus) status: PaymentStatus;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentService.create({
      ...dto,
      userId: req.user.userId,
      userName: req.user.username,
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.paymentService.findAll();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStats() {
    return this.paymentService.getStats();
  }

  @Get('my')
  async findMine(@Request() req: any) {
    return this.paymentService.findByUser(req.user.userId);
  }

  @Get('booking/:bookingId')
  async findByBooking(@Param('bookingId') bookingId: string) {
    return this.paymentService.findByBooking(bookingId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updateStatus(id, dto.status, dto.method);
  }
}

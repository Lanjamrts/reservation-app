import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * POST /bookings
   * Create a new booking (authenticated users)
   */
  @Post()
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req: any) {
    // Override userId with authenticated user's id to prevent spoofing
    createBookingDto.userId = req.user.userId;
    createBookingDto.userName = req.user.username;
    createBookingDto.userEmail = req.user.email;
    return this.bookingService.create(createBookingDto);
  }

  /**
   * GET /bookings
   * Get all bookings — admin only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.bookingService.findAll();
  }

  /**
   * GET /bookings/my
   * Get bookings for the authenticated user
   */
  @Get('my')
  async findMine(@Request() req: any) {
    return this.bookingService.findByUser(req.user.userId);
  }

  /**
   * GET /bookings/slots?resourceId=...&date=YYYY-MM-DD
   * Get available slots for a given resource and date
   */
  @Get('slots')
  async getSlots(
    @Query('resourceId') resourceId: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableSlots(resourceId, date);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStats() {
    return this.bookingService.getStats();
  }

  @Get('resource/:resourceId')
  async findByResource(@Param('resourceId') resourceId: string) {
    return this.bookingService.findByResource(resourceId);
  }

  /**
   * GET /bookings/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  /**
   * PATCH /bookings/:id/status
   * Update booking status — admin only
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.updateStatus(id, updateBookingDto);
  }

  /**
   * DELETE /bookings/:id
   * Cancel a booking (user can cancel their own, admin can cancel any)
   */
  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    const isAdmin = req.user.role === 'admin';
    return this.bookingService.cancel(id, req.user.userId, isAdmin);
  }
}
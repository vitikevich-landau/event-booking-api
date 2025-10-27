import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @ApiResponse({
    status: 409,
    description: 'No seats available or user has already booked',
  })
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.createBooking(createBookingDto);

    return {
      ...booking,
      message: 'Booking created successfully',
    };
  }

  @Get('event/:eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all bookings for an event' })
  @ApiParam({
    name: 'eventId',
    description: 'Event ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for the event',
    type: [BookingResponseDto],
  })
  async getBookingsByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<BookingResponseDto[]> {
    return await this.bookingsService.getBookingsByEventId(eventId);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all bookings for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    type: String,
    example: 'user123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for the user',
    type: [BookingResponseDto],
  })
  async getBookingsByUser(
    @Param('userId') userId: string,
  ): Promise<BookingResponseDto[]> {
    return await this.bookingsService.getBookingsByUserId(userId);
  }
}

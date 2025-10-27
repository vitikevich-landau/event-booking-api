import {
  Controller,
  Get,
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
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventResponseDto } from './dto/event-response.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({
    status: 200,
    description: 'List of all events',
    type: [EventResponseDto],
  })
  async getAllEvents(): Promise<EventResponseDto[]> {
    return await this.eventsService.getAllEvents();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get event by ID with available seats' })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Event details with available seats',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async getEventById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EventResponseDto> {
    return await this.eventsService.getEventWithAvailability(id);
  }
}

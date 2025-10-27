import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy and database is connected',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy or database is disconnected',
  })
  async healthCheck() {
    return this.appService.healthCheck();
  }
}

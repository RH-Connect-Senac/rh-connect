import { Module } from '@nestjs/common';
import { AdminInterviewsController } from './admin-interviews.controller';
import { AdminInterviewsService } from './admin-interviews.service';

@Module({
  controllers: [AdminInterviewsController],
  providers: [AdminInterviewsService],
})
export class AdminInterviewsModule {}

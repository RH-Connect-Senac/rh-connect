import { Module } from '@nestjs/common';
import { AdminCandidatesController } from './admin-candidates.controller';
import { AdminCandidatesService } from './admin-candidates.service';

@Module({
  controllers: [AdminCandidatesController],
  providers: [AdminCandidatesService],
})
export class AdminCandidatesModule {}

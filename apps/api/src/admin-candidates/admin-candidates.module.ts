import { Module } from '@nestjs/common';
import { CandidateProfileModule } from '../candidate-profile/candidate-profile.module';
import { AdminCandidatesController } from './admin-candidates.controller';
import { AdminCandidatesService } from './admin-candidates.service';

@Module({
  imports: [CandidateProfileModule],
  controllers: [AdminCandidatesController],
  providers: [AdminCandidatesService],
})
export class AdminCandidatesModule {}

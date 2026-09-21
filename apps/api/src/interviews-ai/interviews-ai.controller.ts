import { Body, Controller, Post } from '@nestjs/common';

import { EvaluateDto } from './dto/evaluate.dto';
import { JobContextDto } from './dto/job-context.dto';
import { QuestionsDto } from './dto/questions.dto';
import { InterviewsAiService } from './interviews-ai.service';

@Controller('interviews/ai')
export class InterviewsAiController {
  constructor(private readonly interviewsAiService: InterviewsAiService) {}

  @Post('job-context')
  getJobContext(@Body() dto: JobContextDto) {
    return this.interviewsAiService.getJobContext({ ...dto });
  }

  @Post('questions')
  generateQuestions(@Body() dto: QuestionsDto) {
    return this.interviewsAiService.generateQuestions({ ...dto });
  }

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateDto) {
    return this.interviewsAiService.evaluate({ ...dto });
  }
}

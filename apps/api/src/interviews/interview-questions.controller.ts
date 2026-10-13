import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SaveDraftDto } from './dto/save-draft.dto';
import { InterviewQuestionsService } from './interview-questions.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// Mesmo prefixo de InterviewsController. A geração usa `/questions/generate`
// (e não `POST :id/questions`) para NÃO colidir com `POST /interviews/ai/questions`
// do módulo interviews-ai, onde `ai` casaria com `:id`.
@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewQuestionsController {
  constructor(private readonly questionsService: InterviewQuestionsService) {}

  @Post(':id/questions/generate')
  @HttpCode(200)
  @Roles('CANDIDATE')
  generate(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.questionsService.generate(userIdOf(req), id);
  }

  @Get(':id/questions')
  @Roles('CANDIDATE')
  list(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.questionsService.list(userIdOf(req), id);
  }

  @Put(':id/questions/:questionId/answer')
  @Roles('CANDIDATE')
  saveAnswer(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.questionsService.saveAnswer(
      userIdOf(req),
      id,
      questionId,
      dto.answer,
      dto.draftVersion,
    );
  }

  // Rascunho (autosave). NÃO é a confirmação: não altera a resposta oficial.
  @Put(':id/questions/:questionId/answer/draft')
  @Roles('CANDIDATE')
  saveDraft(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() dto: SaveDraftDto,
  ) {
    return this.questionsService.saveDraft(
      userIdOf(req),
      id,
      questionId,
      dto.draft,
      dto.version,
    );
  }
}

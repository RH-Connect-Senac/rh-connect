import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CandidateProfileService } from './candidate-profile.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from './dto/experience.dto';
import { CreateSkillDto } from './dto/skill.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('CANDIDATE')` fica em cada rota. O candidato só enxerga e
// altera o PRÓPRIO perfil: o id vem sempre do JWT, nunca da URL.
@Controller('candidate/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidateProfileController {
  constructor(private readonly service: CandidateProfileService) {}

  @Get()
  @Roles('CANDIDATE')
  get(@Req() req: Request) {
    return this.service.getProfile(userIdOf(req));
  }

  @Patch()
  @Roles('CANDIDATE')
  update(@Req() req: Request, @Body() dto: UpdateCandidateProfileDto) {
    return this.service.updateProfile(userIdOf(req), dto);
  }

  // ---- formações
  @Post('educations')
  @Roles('CANDIDATE')
  addEducation(@Req() req: Request, @Body() dto: CreateEducationDto) {
    return this.service.addEducation(userIdOf(req), dto);
  }

  @Patch('educations/:id')
  @Roles('CANDIDATE')
  updateEducation(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.service.updateEducation(userIdOf(req), id, dto);
  }

  @Delete('educations/:id')
  @Roles('CANDIDATE')
  removeEducation(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeEducation(userIdOf(req), id);
  }

  // ---- cursos
  @Post('courses')
  @Roles('CANDIDATE')
  addCourse(@Req() req: Request, @Body() dto: CreateCourseDto) {
    return this.service.addCourse(userIdOf(req), dto);
  }

  @Patch('courses/:id')
  @Roles('CANDIDATE')
  updateCourse(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.service.updateCourse(userIdOf(req), id, dto);
  }

  @Delete('courses/:id')
  @Roles('CANDIDATE')
  removeCourse(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeCourse(userIdOf(req), id);
  }

  // ---- experiências
  @Post('experiences')
  @Roles('CANDIDATE')
  addExperience(@Req() req: Request, @Body() dto: CreateExperienceDto) {
    return this.service.addExperience(userIdOf(req), dto);
  }

  @Patch('experiences/:id')
  @Roles('CANDIDATE')
  updateExperience(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.service.updateExperience(userIdOf(req), id, dto);
  }

  @Delete('experiences/:id')
  @Roles('CANDIDATE')
  removeExperience(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeExperience(userIdOf(req), id);
  }

  // ---- habilidades (técnicas e comportamentais)
  @Post('skills')
  @Roles('CANDIDATE')
  addSkill(@Req() req: Request, @Body() dto: CreateSkillDto) {
    return this.service.addSkill(userIdOf(req), dto);
  }

  @Delete('skills/:id')
  @Roles('CANDIDATE')
  removeSkill(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeSkill(userIdOf(req), id);
  }

  // ---- declarações de ausência ("não possuo")
  @Put('declarations/courses')
  @HttpCode(200)
  @Roles('CANDIDATE')
  declareNoCourses(@Req() req: Request) {
    return this.service.declareNone(userIdOf(req), 'courses');
  }

  @Delete('declarations/courses')
  @Roles('CANDIDATE')
  removeNoCoursesDeclaration(@Req() req: Request) {
    return this.service.removeDeclaration(userIdOf(req), 'courses');
  }

  @Put('declarations/experience')
  @HttpCode(200)
  @Roles('CANDIDATE')
  declareNoExperience(@Req() req: Request) {
    return this.service.declareNone(userIdOf(req), 'experience');
  }

  @Delete('declarations/experience')
  @Roles('CANDIDATE')
  removeNoExperienceDeclaration(@Req() req: Request) {
    return this.service.removeDeclaration(userIdOf(req), 'experience');
  }

  @Put('declarations/technical-skills')
  @HttpCode(200)
  @Roles('CANDIDATE')
  declareNoTechnicalSkills(@Req() req: Request) {
    return this.service.declareNone(userIdOf(req), 'technicalSkills');
  }

  @Delete('declarations/technical-skills')
  @Roles('CANDIDATE')
  removeNoTechnicalSkillsDeclaration(@Req() req: Request) {
    return this.service.removeDeclaration(userIdOf(req), 'technicalSkills');
  }
}

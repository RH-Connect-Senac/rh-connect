import { Module } from '@nestjs/common';
import { ExternalResourcesController } from './external-resources.controller';
import { ExternalResourcesService } from './external-resources.service';

@Module({
  controllers: [ExternalResourcesController],
  providers: [ExternalResourcesService],
})
export class ExternalResourcesModule {}

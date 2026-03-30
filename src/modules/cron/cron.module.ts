// src/modules/cron/cron.module.ts

import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { HttpModule } from '../http/http.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}

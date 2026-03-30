// src/modules/telegram/telegram.module.ts

import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { HttpModule } from '../http/http.module';
import { TelegramUpdate } from './telegram.update';
import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [
    HttpModule,
    TelegrafModule.forRoot({
      token: '8601007474:AAFBXxfVRlUgOSCzFnPlcZg73MnDLecTaPA',
    }),
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}

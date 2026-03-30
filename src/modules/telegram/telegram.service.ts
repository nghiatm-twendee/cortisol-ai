// src/modules/telegram/telegram.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { HttpService } from '../http/http.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildVoucherMessage } from 'src/lib/voucher';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async registerUser(telegramUser: any) {
    try {
      await this.prisma.telegramUser.upsert({
        where: { telegramId: String(telegramUser.id) },
        update: {
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        },
        create: {
          telegramId: String(telegramUser.id),
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to register user: ${error.message}`);
    }
  }

  //   Get list payment voucher
  async getListPaymentVoucher() {
    const response = await this.httpService.get<ListPaymentVoucherResponse>(
      '/accounting/vouchers',
      {
        params: {
          voucherType: 'PAYMENT',
          page: 1,
          limit: 1,
          sortBy: 'postingDate',
          sortOrder: 'desc',
          filterWaitingApproval: false,
        },
      },
    );

    return response.data;
  }

  //   async saveMessage(
  //     telegramId: string,
  //     text: string,
  //     direction: 'inbound' | 'outbound',
  //   ) {
  //     try {
  //       const user = await this.prisma.user.findUnique({ where: { telegramId } });
  //       if (!user) return;

  //       await this.prisma.message.create({
  //         data: { userId: user.id, text, direction },
  //       });
  //     } catch (error) {
  //       this.logger.error(`Failed to save message: ${error.message}`);
  //     }
  //   }

  //   async getUserHistory(telegramId: string) {
  //     try {
  //       const user = await this.prisma.user.findUnique({
  //         where: { telegramId },
  //         include: {
  //           messages: {
  //             orderBy: { createdAt: 'desc' },
  //             take: 5,
  //           },
  //         },
  //       });
  //       return user?.messages || [];
  //     } catch {
  //       return [];
  //     }
  //   }

  //   async getSystemStatus() {
  //     try {
  //       const [totalUsers, totalMessages] = await Promise.all([
  //         this.prisma.user.count(),
  //         this.prisma.message.count(),
  //       ]);

  //       const uptimeMs = Date.now() - this.startTime;
  //       const uptimeSec = Math.floor(uptimeMs / 1000);
  //       const hours = Math.floor(uptimeSec / 3600);
  //       const minutes = Math.floor((uptimeSec % 3600) / 60);
  //       const seconds = uptimeSec % 60;

  //       return {
  //         dbConnected: true,
  //         totalUsers,
  //         totalMessages,
  //         uptime: `${hours}h ${minutes}m ${seconds}s`,
  //       };
  //     } catch {
  //       return {
  //         dbConnected: false,
  //         totalUsers: 0,
  //         totalMessages: 0,
  //         uptime: 'N/A',
  //       };
  //     }
  //   }

  async fetchExternalData() {
    const randomId = Math.floor(Math.random() * 100) + 1;
    return this.httpService.get(`/posts/${randomId}`);
  }

  async sendMessageToUser(telegramId: string, message: string) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
      });
      //   await this.saveMessage(telegramId, message, 'outbound');
      this.logger.log(`Message sent to user ${telegramId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${telegramId}: ${error.message}`,
      );
      throw error;
    }
  }

  //   async broadcastMessage(message: string) {
  //     try {
  //       const users = await this.prisma.user.findMany({
  //         where: { isActive: true },
  //       });
  //       const results = await Promise.allSettled(
  //         users.map((user) => this.sendMessageToUser(user.telegramId, message)),
  //       );

  //       const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  //       const failed = results.filter((r) => r.status === 'rejected').length;

  //       this.logger.log(
  //         `Broadcast complete: ${succeeded} sent, ${failed} failed`,
  //       );
  //       return { succeeded, failed, total: users.length };
  //     } catch (error) {
  //       this.logger.error(`Broadcast failed: ${error.message}`);
  //       throw error;
  //     }
  //   }
}

// src/modules/telegram/telegram.update.ts

import { Logger } from '@nestjs/common';
import { Update, Start, Help, On, Hears, Ctx, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramService } from './telegram.service';
import { buildVoucherMessage } from 'src/lib/voucher';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const user = ctx.from;
    this.logger.log(`New user started bot: ${user?.username || user?.id}`);

    await this.telegramService.registerUser(user);

    await ctx.reply(
      `👋 Welcome, ${user?.first_name || 'there'}!\n\n` +
        `I'm your NestJS bot. Here's what I can do:\n\n` +
        `📌 /start - Start the bot\n` +
        `❓ /help - Show help\n` +
        `📊 /status - Get system status\n` +
        `🌐 /payment_voucher - Fetch data from Payment voucher\n` +
        `📝 /history - View your message history`,
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply(
      `🤖 *Available Commands:*\n\n` +
        `/start - Initialize the bot\n` +
        `/help - Show this help message\n` +
        `/payment_voucher - Fetch data from Payment voucher\n` +
        { parse_mode: 'Markdown' },
    );
  }

  @Start()
  start(@Ctx() ctx: Context) {
    ctx.reply('Welcome to Cortisol AI bot 🚀');
  }

  @Command('payment_voucher')
  async onFetch(@Ctx() ctx: Context) {
    await ctx.reply('⏳ Cứ từ từ Hà Nội không vội bạn ơi...');
    const listVoucherMsg = await this.telegramService.getListPaymentVoucher();
    const firstVoucherMsg = buildVoucherMessage(listVoucherMsg[0]);
    await ctx.reply(`${firstVoucherMsg}`, { parse_mode: 'Markdown' });
  }

  @On('text')
  onMessage(@Ctx() ctx: Context) {
    const text = 'Good morning';

    ctx.reply(`You said: ${text}`);
  }

  @Hears(/hello/i)
  async onHello(@Ctx() ctx: Context) {
    await ctx.reply(
      `Hello! 👋 Nice to meet you! Type /help for available commands.`,
    );
  }
}

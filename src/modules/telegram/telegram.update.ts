// src/modules/telegram/telegram.update.ts

import { Logger } from '@nestjs/common';
import {
  Action,
  Command,
  Ctx,
  Hears,
  Help,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { buildVoucherMessage } from 'src/lib/voucher';
import { TelegramService } from './telegram.service';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const user = ctx.from;
    this.logger.log(`New user started bot: ${user?.username || user?.id}`);

    await this.telegramService.registerUser(user);

    const name = user?.first_name || 'bạn';
    await ctx.reply(
      `👋 Xin chào, <b>${name}</b>!\n\n` +
        `Tôi là trợ lý quản lý <b>phiếu kế toán ERP</b> qua Telegram.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚙️ <b>Thiết lập</b>\n` +
        `/connect_erp &lt;token&gt; — Kết nối tài khoản ERP\n\n` +
        `🔍 <b>Tìm kiếm phiếu</b>\n` +
        `/search_voucher — Tìm kiếm bằng ngôn ngữ tự nhiên\n` +
        `/examplesearch — Xem ví dụ câu tìm kiếm\n` +
        `/payment_voucher — Xem phiếu mới nhất\n\n` +
        `✅ <b>Phê duyệt phiếu</b>\n` +
        `Bot tự động gửi thông báo khi có phiếu cần duyệt.\n` +
        `Bạn chỉ cần nhấn nút <b>Phê duyệt</b> hoặc <b>Từ chối</b>.\n\n` +
        `🔔 <b>Thông báo tự động</b>\n` +
        `• Người duyệt tiếp theo được thông báo sau mỗi lần phê duyệt\n` +
        `• Người duyệt trước được thông báo khi phiếu bị từ chối\n` +
        `• Người tạo và người duyệt đầu được thông báo khi hoàn tất\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💬 Bạn cũng có thể <b>nhắn tin hoặc gửi giọng nói</b> để tôi hỗ trợ!\n` +
        `/help — Xem lại danh sách lệnh`,
      { parse_mode: 'HTML' },
    );
  }

  @On('my_chat_member')
  async onMyChatMember(@Ctx() ctx: Context) {
    const chatMemberUpdate = (ctx.update as any).my_chat_member;
    if (!chatMemberUpdate) return;

    const isBot = chatMemberUpdate.new_chat_member.user.is_bot;
    const status = chatMemberUpdate.new_chat_member.status;
    const chat = chatMemberUpdate.chat;

    if (!isBot || (status !== 'member' && status !== 'administrator')) return;

    const isGroup = chat.type === 'group' || chat.type === 'supergroup';
    if (!isGroup) return;

    await ctx.reply(
      `👋 Cảm ơn đã thêm tôi vào nhóm!\n\n` +
        `🔍 *Trong nhóm, tôi có thể:*\n` +
        `• Tìm kiếm phiếu bằng câu hỏi tự nhiên\n` +
        `• Hiển thị chi tiết phiếu\n` +
        `• Hỗ trợ trả lời câu hỏi\n\n` +
        `⚠️ *Lưu ý:*\n` +
        `• Phê duyệt/từ chối phiếu chỉ có thể thực hiện trong tin nhắn riêng\n` +
        `• Để tìm kiếm phiếu, hãy dùng lệnh: /search_voucher [mô tả]\n` +
        `• Để xem phiếu mới nhất: /payment_voucher\n` +
        `• Hoặc nhắn tin tự do để hỏi về phiếu\n\n` +
        `💡 *Để kết nối ERP cho nhóm:*\n` +
        `Vui lòng ${ctx.from?.username ? `@${ctx.from.username} ` : ''}nhắn riêng cho bot với lệnh \`/connect_erp <token>\``,
      { parse_mode: 'Markdown' },
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply(
      `🤖 <b>Danh sách lệnh:</b>\n\n` +
        `/connect_erp &lt;token&gt; — Kết nối tài khoản ERP\n` +
        `/search_voucher — Tìm kiếm phiếu bằng ngôn ngữ tự nhiên\n` +
        `/examplesearch — Xem ví dụ câu tìm kiếm\n` +
        `/payment_voucher — Xem phiếu mới nhất\n` +
        `/help — Hiển thị trợ giúp này\n\n` +
        `💬 Nhắn tin tự do hoặc gửi giọng nói để hỏi thêm!`,
      { parse_mode: 'HTML' },
    );
  }

  @Command('connect_erp')
  async onConnectErp(@Ctx() ctx: Context): Promise<void> {
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (isGroup) {
      await ctx.reply(
        '⚠️ Lệnh `/connect_erp` chỉ có thể sử dụng trong tin nhắn riêng.\n\n' +
          `Vui lòng ${ctx.from?.username ? `@${ctx.from.username} nhắn riêng cho bot hoặc ` : ''}nhắn riêng cho bot để kết nối tài khoản ERP.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const text = (ctx.message as any)?.text ?? '';
    const token = text.replace('/connect_erp', '').trim();

    // Delete the message immediately to avoid exposing the token in chat
    try {
      await ctx.deleteMessage();
    } catch {}

    if (!token) {
      await ctx.reply(
        '⚠️ Vui lòng cung cấp token ERP của bạn:\n\n`/connect_erp <token>`\n\nLấy token: Đăng nhập ERP → F12 → Application → localStorage → `access_token`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (this.telegramService.isTokenExpired(token)) {
      await ctx.reply(
        '❌ Token đã hết hạn. Vui lòng đăng nhập lại vào ERP và lấy token mới.',
      );
      return;
    }

    const telegramId = String(ctx.from?.id);
    await this.telegramService.saveErpToken(telegramId, token);
    await ctx.reply(
      '✅ Đã lưu token ERP thành công! Bạn có thể phê duyệt phiếu qua Telegram.',
    );
  }

  @Command('payment_voucher')
  async onFetch(@Ctx() ctx: Context) {
    await ctx.reply('⏳ Cứ từ từ Hà Nội không vội bạn ơi...');
    const listVoucherMsg = await this.telegramService.getListPaymentVoucher();
    const firstVoucherMsg = buildVoucherMessage(listVoucherMsg[0]);
    await ctx.reply(`${firstVoucherMsg}`, { parse_mode: 'Markdown' });
  }

  @Command('examplesearch')
  async onExampleSearch(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply(
      `💡 *Ví dụ tìm kiếm phiếu*\n\n` +
        `Sau khi gõ /search\\_voucher, bạn có thể nhập:\n\n` +
        `*Theo loại & trạng thái:*\n` +
        `• Tìm phiếu chi đã duyệt\n` +
        `• Phiếu thu bị từ chối\n` +
        `• Tất cả phiếu đang chờ duyệt\n\n` +
        `*Theo thời gian:*\n` +
        `• Phiếu chi tháng 3 năm 2024\n` +
        `• Phiếu thu quý 1 2025\n` +
        `• Phiếu chi tuần này\n` +
        `• Phiếu từ 01/01/2024 đến 30/06/2024\n\n` +
        `*Theo số tiền:*\n` +
        `• Phiếu chi trên 10 triệu\n` +
        `• Phiếu thu dưới 5 triệu đồng\n` +
        `• Phiếu chi từ 1 triệu đến 50 triệu\n\n` +
        `*Theo nội dung / người:*\n` +
        `• Phiếu chi lương tháng 4\n` +
        `• Tìm phiếu của Nguyễn Văn A\n` +
        `• Phiếu chi tiền thưởng đã duyệt\n\n` +
        `*Kết hợp nhiều điều kiện:*\n` +
        `• Phiếu chi lương tháng 3 trên 15 triệu đã duyệt\n` +
        `• Phiếu thu bị từ chối quý 2 2024 dưới 10 triệu`,
      { parse_mode: 'Markdown' },
    );
  }

  @Command('search_voucher')
  async onSearchVoucher(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    let erpAccessToken: string | undefined;

    if (isGroup && ctx.chat?.id) {
      // Try to get group token first, then fall back to user token
      const groupId = String(ctx.chat.id);
      erpAccessToken = this.telegramService.getGroupErpToken(groupId);

      if (!erpAccessToken) {
        // Try user's personal token
        const userLink =
          await this.telegramService.getUserLinkByTelegramId(telegramId);
        erpAccessToken = (userLink?.erpAccessToken as string) || undefined;
      }
    } else {
      // Private chat - use user token
      const userLink =
        await this.telegramService.getUserLinkByTelegramId(telegramId);
      erpAccessToken = (userLink?.erpAccessToken as string) || undefined;
    }

    if (
      !erpAccessToken ||
      this.telegramService.isTokenExpired(erpAccessToken)
    ) {
      await ctx.reply(
        '⚠️ Token ERP chưa được thiết lập hoặc đã hết hạn.\n' +
          (isGroup
            ? 'Vui lòng yêu cầu quản trị viên nhóm hoặc ai đó với tài khoản ERP nhắn riêng cho bot: '
            : 'Vui lòng ') +
          '`/connect_erp <token>`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    this.telegramService.setPendingVoucherSearch(telegramId, {
      erpAccessToken,
    });

    await ctx.reply(
      `🔍 *Tìm kiếm phiếu*\n\n` +
        `Nhập yêu cầu bằng ngôn ngữ tự nhiên hoặc gửi tin nhắn thoại:\n\n` +
        `*Ví dụ:*\n` +
        `• Tìm phiếu chi tháng 3 2024 đã duyệt\n` +
        `• Phiếu thu bị từ chối từ tháng 1 đến tháng 6\n` +
        `• Phiếu chi lương trên 10 triệu\n` +
        `• Tìm phiếu chờ duyệt của Nguyễn Văn A`,
      { parse_mode: 'Markdown' },
    );
  }

  @Action(/^approve:/)
  async onApprove(@Ctx() ctx: Context): Promise<void> {
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (isGroup) {
      await ctx.answerCbQuery('⚠️ Phê duyệt chỉ có thể thực hiện trong tin nhắn riêng');
      return;
    }

    const voucherId = (ctx.callbackQuery as any).data.replace('approve:', '');
    const telegramId = String(ctx.from?.id);

    const userLink =
      await this.telegramService.getUserLinkByTelegramId(telegramId);

    if (
      !userLink?.erpAccessToken ||
      this.telegramService.isTokenExpired(userLink.erpAccessToken)
    ) {
      await ctx.answerCbQuery('⚠️ Token ERP hết hạn');
      await ctx.reply(
        '⚠️ Token ERP của bạn đã hết hạn.\nVui lòng đăng nhập lại ERP và gửi:\n\n`/connect_erp <token>`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    try {
      await this.telegramService.approveVoucher(
        voucherId,
        userLink.erpAccessToken,
      );

      try {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      } catch {}

      await ctx.answerCbQuery('✅ Phê duyệt thành công');
      await ctx.reply('✅ *Phê duyệt thành công*', { parse_mode: 'Markdown' });

      await this.telegramService.notifyNextPendingApprover(voucherId);
    } catch (error) {
      this.logger.error(
        `Approve failed for voucher ${voucherId}: ${error.message}`,
      );
      console.log('>>error: ', error);
      await ctx.answerCbQuery('❌ Có lỗi xảy ra, vui lòng thử lại');
    }
  }

  @Action(/^reject:/)
  async onReject(@Ctx() ctx: Context): Promise<void> {
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (isGroup) {
      await ctx.answerCbQuery('⚠️ Từ chối chỉ có thể thực hiện trong tin nhắn riêng');
      return;
    }

    const voucherId = (ctx.callbackQuery as any).data.replace('reject:', '');
    const telegramId = String(ctx.from?.id);
    const rejectorName =
      [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') ||
      'Approver';

    const userLink =
      await this.telegramService.getUserLinkByTelegramId(telegramId);

    if (
      !userLink?.erpAccessToken ||
      this.telegramService.isTokenExpired(userLink.erpAccessToken)
    ) {
      await ctx.answerCbQuery('⚠️ Token ERP hết hạn');
      await ctx.reply(
        '⚠️ Token ERP của bạn đã hết hạn.\nVui lòng đăng nhập lại ERP và gửi:\n\n`/connect_erp <token>`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Remove buttons and store pending rejection state
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch {}

    await ctx.answerCbQuery();

    this.telegramService.setPendingRejection(telegramId, {
      voucherId,
      erpAccessToken: userLink.erpAccessToken,
      rejectorName,
      step: 'reason',
    });

    await ctx.reply('📝 *Bước 1/2* — Nhập *lý do từ chối* (reason):', {
      parse_mode: 'Markdown',
      reply_markup: { force_reply: true, selective: true },
    });
  }

  @On('text')
  async onMessage(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    let text = ((ctx.message as any)?.text ?? '').trim();
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (text.startsWith('/')) return;

    // In groups, strip the bot mention if present
    const wasMentioned = text.match(/@\w+/);
    if (isGroup) {
      text = text.replace(/@\w+\s*/g, '').trim();
      // If message is now empty after removing mentions, ignore it
      if (!text) return;
    }

    if (await this.handleVoucherSearchInput(telegramId, text, ctx)) return;
    if (await this.handleRejectionInput(telegramId, text, ctx)) return;
    if (await this.handleFilterQuery(telegramId, text, ctx, isGroup && wasMentioned))
      return;
    await this.handleWithDispatch(telegramId, text, ctx);
  }

  @On('voice')
  async onVoice(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const fileId = (ctx.message as any)?.voice?.file_id;
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    const hasPendingSearch =
      !!this.telegramService.getPendingVoucherSearch(telegramId);
    const hasPendingRejection =
      !!this.telegramService.getPendingRejection(telegramId);

    if (!hasPendingSearch && !hasPendingRejection) {
      // No pending state — transcribe and send to agent
      const processingMsg = await ctx.reply(
        '🎤 Đang chuyển giọng nói thành văn bản...',
      );
      try {
        let text = await this.telegramService.transcribeVoice(fileId);

        // In groups, strip bot mention if present
        if (isGroup) {
          text = text.replace(/@\w+\s*/g, '').trim();
        }

        try {
          await ctx.telegram.deleteMessage(
            ctx.chat!.id,
            processingMsg.message_id,
          );
        } catch {}
        await ctx.reply(`🎤 *Nhận được:* _${text}_`, {
          parse_mode: 'Markdown',
        });
        await this.handleWithDispatch(telegramId, text, ctx);
      } catch (error) {
        this.logger.error(`Voice transcription failed: ${error.message}`);
        await ctx.reply(
          '❌ Không thể chuyển giọng nói thành văn bản, vui lòng nhập text.',
        );
      }
      return;
    }

    const processingMsg = await ctx.reply(
      '🎤 Đang chuyển giọng nói thành văn bản...',
    );

    try {
      let text = await this.telegramService.transcribeVoice(fileId);

      // In groups, strip bot mention if present
      if (isGroup) {
        text = text.replace(/@\w+\s*/g, '').trim();
      }

      try {
        await ctx.telegram.deleteMessage(
          ctx.chat!.id,
          processingMsg.message_id,
        );
      } catch {}

      await ctx.reply(`🎤 *Nhận được:* _${text}_`, { parse_mode: 'Markdown' });

      if (hasPendingSearch) {
        await this.handleVoucherSearchInput(telegramId, text, ctx);
      } else {
        await this.handleRejectionInput(telegramId, text, ctx);
      }
    } catch (error) {
      this.logger.error(`Voice transcription failed: ${error.message}`);
      await ctx.reply(
        '❌ Không thể chuyển giọng nói thành văn bản, vui lòng nhập text.',
      );
    }
  }

  private async handleRejectionInput(
    telegramId: string,
    text: string,
    ctx: Context,
  ): Promise<boolean> {
    const pending = this.telegramService.getPendingRejection(telegramId);
    if (!pending) return false;

    if (pending.step === 'reason') {
      this.telegramService.setPendingRejection(telegramId, {
        ...pending,
        step: 'comments',
        reason: text,
      });
      await ctx.reply('💬 *Bước 2/2* — Nhập *bình luận bổ sung* (comments):', {
        parse_mode: 'Markdown',
        reply_markup: { force_reply: true, selective: true },
      });
      return true;
    }

    // step === 'comments' — submit rejection
    this.telegramService.clearPendingRejection(telegramId);
    try {
      await this.telegramService.rejectVoucher(
        pending.voucherId,
        pending.erpAccessToken,
        text,
        pending.reason ?? '',
      );
      await ctx.reply('❌ *Đã từ chối phiếu thành công*', {
        parse_mode: 'Markdown',
      });
      await this.telegramService.notifyVoucherCreatorRejected(
        pending.voucherId,
        pending.rejectorName,
        pending.reason ?? '',
        text,
      );
    } catch (error) {
      this.logger.error(
        `Reject failed for voucher ${pending.voucherId}: ${error.message}`,
      );
      console.log('>>error: ', error?.response?.data);
      await ctx.reply('❌ Có lỗi xảy ra khi từ chối phiếu, vui lòng thử lại.');
    }
    return true;
  }

  private async handleWithDispatch(
    telegramId: string,
    text: string,
    ctx: Context,
  ): Promise<void> {
    const userName = ctx.from?.first_name;
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    try {
      await ctx.sendChatAction('typing');

      const previousParams =
        this.telegramService.getLastSearchParams(telegramId);
      const dispatch = await this.telegramService.dispatchIntent(text, {
        previousParams,
        userName,
      });

      if (dispatch.tool === 'searchVouchers') {
        let erpAccessToken: string | undefined = undefined;

        if (isGroup && ctx.chat?.id) {
          // Try group token first, then user token
          const groupId = String(ctx.chat.id);
          const groupToken = this.telegramService.getGroupErpToken(groupId);
          if (groupToken) {
            erpAccessToken = groupToken;
          } else {
            const userLink =
              await this.telegramService.getUserLinkByTelegramId(telegramId);
            erpAccessToken = (userLink?.erpAccessToken as string) || undefined;
          }
        } else {
          // Private chat
          const userLink =
            await this.telegramService.getUserLinkByTelegramId(telegramId);
          erpAccessToken = (userLink?.erpAccessToken as string) || undefined;
        }

        if (
          !erpAccessToken ||
          this.telegramService.isTokenExpired(erpAccessToken)
        ) {
          await ctx.reply(
            isGroup
              ? '⚠️ Token ERP chưa được thiết lập. Vui lòng yêu cầu ai đó kết nối ERP qua lệnh: `/connect_erp <token>`'
              : '⚠️ Bạn cần kết nối tài khoản ERP trước.\n\nDùng lệnh /connect_erp <token> để kết nối.',
          );
          return;
        }

        const params = dispatch.arguments as VoucherSearchParams;
        this.telegramService.setLastSearchParams(telegramId, params);

        const result = await this.telegramService.searchVouchers(
          params,
          erpAccessToken,
        );
        const message =
          this.telegramService.buildVoucherSearchResultMessage(result);
        await ctx.reply(message, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(
          dispatch.arguments['reply'] ??
            '🤖 Xin lỗi, tôi chưa hiểu. Bạn thử diễn đạt lại nhé!',
        );
      }
    } catch (error) {
      this.logger.error(`Dispatch failed: ${error.message}`);
      await ctx.reply(
        '🤖 Xin lỗi, tôi đang gặp sự cố. Bạn có thể thử lại hoặc dùng /help để xem các lệnh.',
      );
    }
  }

  private async handleVoucherSearchInput(
    telegramId: string,
    text: string,
    ctx: Context,
  ): Promise<boolean> {
    const pending = this.telegramService.getPendingVoucherSearch(telegramId);
    if (!pending) return false;

    this.telegramService.clearPendingVoucherSearch(telegramId);

    const loadingMsg = await ctx.reply('🔍 Đang tìm kiếm...');

    try {
      const previousParams =
        this.telegramService.getLastSearchParams(telegramId);
      const params = await this.telegramService.parseVoucherQuery(
        text,
        previousParams,
      );
      console.log('>>params: ', params);

      this.telegramService.setLastSearchParams(telegramId, params);
      const result = await this.telegramService.searchVouchers(
        params,
        pending.erpAccessToken,
      );

      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
      } catch {}

      const message =
        this.telegramService.buildVoucherSearchResultMessage(result);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`Voucher search failed: ${error.message}`);
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
      } catch {}
      await ctx.reply('❌ Có lỗi xảy ra khi tìm kiếm, vui lòng thử lại.');
    }

    return true;
  }

  @Action(/^filter_type:/)
  async onFilterType(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const voucherType = (ctx.callbackQuery as any).data.replace('filter_type:', '');

    const pending = this.telegramService.getPendingFilterQuery(telegramId);
    if (!pending) {
      await ctx.answerCbQuery('❌ Phiên làm việc hết hạn');
      return;
    }

    this.telegramService.setPendingFilterQuery(telegramId, {
      ...pending,
      voucherType: voucherType === 'all' ? undefined : voucherType,
      step: 'status',
    });

    await ctx.answerCbQuery();
    await this.showStatusFilter(ctx, telegramId, pending.erpAccessToken);
  }

  @Action(/^filter_status:/)
  async onFilterStatus(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const status = (ctx.callbackQuery as any).data.replace('filter_status:', '');

    const pending = this.telegramService.getPendingFilterQuery(telegramId);
    if (!pending) {
      await ctx.answerCbQuery('❌ Phiên làm việc hết hạn');
      return;
    }

    this.telegramService.setPendingFilterQuery(telegramId, {
      ...pending,
      status: status === 'all' ? undefined : status,
      step: 'date',
    });

    await ctx.answerCbQuery();
    await this.showDateFilter(ctx, telegramId, pending.erpAccessToken);
  }

  @Action(/^filter_date:/)
  async onFilterDate(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const dateRange = (ctx.callbackQuery as any).data.replace('filter_date:', '');

    const pending = this.telegramService.getPendingFilterQuery(telegramId);
    if (!pending) {
      await ctx.answerCbQuery('❌ Phiên làm việc hết hạn');
      return;
    }

    this.telegramService.setPendingFilterQuery(telegramId, {
      ...pending,
      dateRange: dateRange === 'all' ? undefined : dateRange,
      step: 'confirm',
    });

    await ctx.answerCbQuery();
    await this.showConfirmFilter(ctx, telegramId, pending.erpAccessToken);
  }

  @Action(/^filter_confirm:/)
  async onFilterConfirm(@Ctx() ctx: Context): Promise<void> {
    const telegramId = String(ctx.from?.id);
    const action = (ctx.callbackQuery as any).data.replace('filter_confirm:', '');

    const pending = this.telegramService.getPendingFilterQuery(telegramId);
    if (!pending) {
      await ctx.answerCbQuery('❌ Phiên làm việc hết hạn');
      return;
    }

    if (action === 'cancel') {
      this.telegramService.clearPendingFilterQuery(telegramId);
      await ctx.answerCbQuery();
      await ctx.reply('❌ Đã hủy tìm kiếm');
      return;
    }

    await ctx.answerCbQuery('🔍 Đang tìm kiếm...');

    try {
      // Build search params from filters
      const params: VoucherSearchParams = {
        page: 1,
        limit: 10,
      };

      if (pending.voucherType && pending.voucherType !== 'all') {
        params.voucherType = pending.voucherType;
      }

      if (pending.status && pending.status !== 'all') {
        params.status = pending.status;
      }

      const result = await this.telegramService.searchVouchers(
        params,
        pending.erpAccessToken,
      );

      this.telegramService.clearPendingFilterQuery(telegramId);

      if (result.data.length === 0) {
        await ctx.reply('📭 Không tìm thấy phiếu nào phù hợp với bộ lọc của bạn.');
        return;
      }

      const message =
        this.telegramService.buildVoucherSearchResultMessage(result);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`Filter search failed: ${error.message}`);
      this.telegramService.clearPendingFilterQuery(telegramId);
      await ctx.reply('❌ Có lỗi xảy ra khi tìm kiếm, vui lòng thử lại.');
    }
  }

  private async handleFilterQuery(
    telegramId: string,
    text: string,
    ctx: Context,
    wasMentionedInGroup: boolean,
  ): Promise<boolean> {
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    const pending = this.telegramService.getPendingFilterQuery(telegramId);

    // If there's a pending filter query, continue with that flow
    if (pending) {
      if (pending.step === 'type') {
        await this.showTypeFilter(ctx, telegramId, pending.erpAccessToken);
        return true;
      }
      return false;
    }

    // In groups with mention, start filter flow
    if (isGroup && wasMentionedInGroup) {
      let erpAccessToken: string | undefined = undefined;

      if (ctx.chat?.id) {
        const groupId = String(ctx.chat.id);
        erpAccessToken = this.telegramService.getGroupErpToken(groupId);

        if (!erpAccessToken) {
          const userLink =
            await this.telegramService.getUserLinkByTelegramId(telegramId);
          erpAccessToken = (userLink?.erpAccessToken as string) || undefined;
        }
      }

      if (
        !erpAccessToken ||
        this.telegramService.isTokenExpired(erpAccessToken)
      ) {
        await ctx.reply(
          '⚠️ Token ERP chưa được thiết lập hoặc đã hết hạn.\nVui lòng yêu cầu ai đó kết nối ERP qua lệnh: `/connect_erp <token>`',
        );
        return true;
      }

      // Start filter query flow
      this.telegramService.setPendingFilterQuery(telegramId, {
        erpAccessToken,
        initialQuery: text,
        step: 'type',
      });

      await this.showTypeFilter(ctx, telegramId, erpAccessToken);
      return true;
    }

    return false;
  }

  private async showTypeFilter(
    ctx: Context,
    _telegramId: string,
    _erpAccessToken: string,
  ): Promise<void> {
    await ctx.reply(
      '🔎 *Chọn loại phiếu:*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💰 Phiếu Chi',
                callback_data: 'filter_type:PAYMENT',
              },
              {
                text: '📥 Phiếu Thu',
                callback_data: 'filter_type:RECEIPT',
              },
            ],
            [
              {
                text: '📋 Tất cả loại',
                callback_data: 'filter_type:all',
              },
            ],
          ],
        },
      },
    );
  }

  private async showStatusFilter(
    ctx: Context,
    _telegramId: string,
    _erpAccessToken: string,
  ): Promise<void> {
    await ctx.reply(
      '📊 *Chọn trạng thái:*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⏳ Chờ duyệt',
                callback_data: 'filter_status:PENDING',
              },
              {
                text: '✅ Đã duyệt',
                callback_data: 'filter_status:APPROVED',
              },
            ],
            [
              {
                text: '❌ Từ chối',
                callback_data: 'filter_status:REJECTED',
              },
              {
                text: '📝 Bản thảo',
                callback_data: 'filter_status:DRAFT',
              },
            ],
            [
              {
                text: '📋 Tất cả trạng thái',
                callback_data: 'filter_status:all',
              },
            ],
          ],
        },
      },
    );
  }

  private async showDateFilter(
    ctx: Context,
    _telegramId: string,
    _erpAccessToken: string,
  ): Promise<void> {
    await ctx.reply(
      '📅 *Chọn khoảng thời gian:*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📆 Hôm nay',
                callback_data: 'filter_date:today',
              },
              {
                text: '📊 Tuần này',
                callback_data: 'filter_date:week',
              },
            ],
            [
              {
                text: '📈 Tháng này',
                callback_data: 'filter_date:month',
              },
              {
                text: '🔢 Quý này',
                callback_data: 'filter_date:quarter',
              },
            ],
            [
              {
                text: '📅 Tất cả thời gian',
                callback_data: 'filter_date:all',
              },
            ],
          ],
        },
      },
    );
  }

  private async showConfirmFilter(
    ctx: Context,
    telegramId: string,
    _erpAccessToken: string,
  ): Promise<void> {
    const pending = this.telegramService.getPendingFilterQuery(telegramId);
    if (!pending) return;

    let summary = '📋 *Tóm tắt bộ lọc:*\n\n';

    const typeMap: Record<string, string> = {
      PAYMENT: '💰 Phiếu Chi',
      RECEIPT: '📥 Phiếu Thu',
    };

    const statusMap: Record<string, string> = {
      PENDING: '⏳ Chờ duyệt',
      APPROVED: '✅ Đã duyệt',
      REJECTED: '❌ Từ chối',
      DRAFT: '📝 Bản thảo',
    };

    const dateMap: Record<string, string> = {
      today: '📆 Hôm nay',
      week: '📊 Tuần này',
      month: '📈 Tháng này',
      quarter: '🔢 Quý này',
    };

    summary += `📌 *Loại:* ${pending.voucherType ? typeMap[pending.voucherType] || pending.voucherType : 'Tất cả'}\n`;
    summary += `📊 *Trạng thái:* ${pending.status ? statusMap[pending.status] || pending.status : 'Tất cả'}\n`;
    summary += `📅 *Thời gian:* ${pending.dateRange ? dateMap[pending.dateRange] || pending.dateRange : 'Tất cả'}\n`;

    await ctx.reply(summary, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔍 Tìm kiếm',
              callback_data: 'filter_confirm:search',
            },
            {
              text: '❌ Hủy',
              callback_data: 'filter_confirm:cancel',
            },
          ],
        ],
      },
    });
  }

  @Hears(/hello/i)
  async onHello(@Ctx() ctx: Context) {
    await ctx.reply(
      `Hello! 👋 Nice to meet you! Type /help for available commands.`,
    );
  }
}

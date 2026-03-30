// src/modules/cron/cron.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpService } from '../http/http.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async getListLatestPaymentVoucher() {
    // const response = await this.httpService.get<ListPaymentVoucherResponse>(
    //   '/accounting/vouchers',
    //   {
    //     params: {
    //       voucherType: 'PAYMENT',
    //       page: 1,
    //       limit: 20,
    //       sortBy: 'postingDate',
    //       sortOrder: 'desc',
    //       filterWaitingApproval: false,
    //     },
    //   },
    // );
    // console.log('response: ', response);
  }
}

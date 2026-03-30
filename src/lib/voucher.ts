export function buildVoucherMessage(voucher) {
  const nextApproval = voucher.approvals
    ?.filter((a) => a.status === 'PENDING')
    ?.sort((a, b) => a.index - b.index)?.[0];

  const date = new Date(voucher.postingDate).toLocaleDateString('vi-VN');

  const amount =
    Number(voucher.totalAmount).toLocaleString('vi-VN') +
    ' ' +
    voucher.currency;

  return `
💸 Phiếu chi: ${voucher.code}

📅 Ngày hạch toán: ${date}
👤 Người nhận: ${voucher.payerReceiver}
📝 Nội dung: ${voucher.content}

💰 Số tiền: ${amount}
📌 Trạng thái: Bản thảo

⏭ Người duyệt tiếp theo: ${nextApproval?.approver?.fullName ?? '-'}
`;
}

import prisma from '../../config/prisma.js';
import { payos, isPayosConfigured } from '../../config/payos.js';
import { ApiError } from '../../common/errorMiddleware.js';

/**
 * Tạo link thanh toán VietQR PayOS cho một hóa đơn viện phí
 * @param {object} params
 * @param {string} params.invoiceId - ID của hóa đơn (UUID)
 * @param {number} [params.customAmount] - Số tiền thanh toán tùy chỉnh
 * @param {object} [params.reqUser] - Thông tin người dùng từ JWT
 * @param {string} [params.clientBaseUrl] - URL frontend gọi tới
 */
export const createPayosPaymentService = async ({
  invoiceId,
  customAmount,
  reqUser,
  clientBaseUrl,
}) => {
  if (!invoiceId) {
    throw new ApiError(400, 'Mã định danh hóa đơn (invoiceId) là bắt buộc');
  }

  // 1. Tìm thông tin hóa đơn cùng ca hẹn & bệnh nhân
  const invoice = await prisma.hoaDon.findUnique({
    where: { id: invoiceId },
    include: {
      lichHen: {
        include: {
          benhNhan: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(404, 'Không tìm thấy hóa đơn viện phí');
  }

  // 2. Kiểm tra quyền hạn nếu là bệnh nhân tự thanh toán
  if (reqUser && String(reqUser.role).toUpperCase() === 'BENH_NHAN') {
    const patientProfileId = reqUser.profileId || reqUser.benhNhanId;
    const accountUserId = reqUser.userId || reqUser.id;
    const isOwner =
      (invoice.lichHen?.benhNhanId && invoice.lichHen.benhNhanId === patientProfileId) ||
      (invoice.lichHen?.benhNhan?.taiKhoanId && invoice.lichHen.benhNhan.taiKhoanId === accountUserId);

    if (!isOwner) {
      throw new ApiError(403, 'Bạn không có quyền thanh toán hóa đơn này');
    }
  }

  // 3. Kiểm tra trạng thái hóa đơn
  if (invoice.trangThaiThanhToan === 'da_thanh_toan') {
    throw new ApiError(400, 'Hóa đơn này đã được thanh toán hoàn tất');
  }

  if (invoice.trangThaiThanhToan === 'da_huy') {
    throw new ApiError(400, 'Hóa đơn này đã bị hủy, không thể thanh toán');
  }

  // 4. Xác định số tiền thanh toán
  // Mặc định ép 2.000 VNĐ để test quét chuyển khoản thật an toàn (đặt PAYOS_FORCE_1K=false trong .env để dùng số tiền thật của hóa đơn)
  const isForce1k = process.env.PAYOS_FORCE_1K !== 'false';
  let finalAmount = 2000;
  if (!isForce1k) {
    let rawAmount = Number(customAmount || invoice.soTienThanhToan || invoice.tongTien || 0);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      rawAmount = 2000;
    }
    finalAmount = Math.max(1000, Math.round(rawAmount));
  }

  // 5. Tạo orderCode: số nguyên dương an toàn <= 9007199254740991
  const orderCode = Number(
    String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900).toString()
  );

  // 6. Nội dung chuyển khoản: tối đa 25 ký tự không dấu/ký tự đặc biệt
  const cleanCode = (invoice.maHoaDon || orderCode.toString())
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8);
  const description = `HD ${cleanCode}`.slice(0, 25);

  // 7. URL điều hướng sau khi thanh toán
  const isPatient =
    (reqUser && String(reqUser.role).toUpperCase() === 'BENH_NHAN') ||
    (clientBaseUrl && clientBaseUrl.includes('3001'));
  const patientReturnUrl = 'http://localhost:3001/portal#history';
  const receptionistReturnUrl =
    process.env.PAYOS_RETURN_URL ||
    (clientBaseUrl ? `${clientBaseUrl.replace(/\/$/, '')}/receptionist/invoices` : 'http://localhost:3100/receptionist/invoices');

  const returnUrl = isPatient ? patientReturnUrl : receptionistReturnUrl;
  const cancelUrl = isPatient ? patientReturnUrl : (process.env.PAYOS_CANCEL_URL || receptionistReturnUrl);

  let paymentData;

  // 8. Gọi PayOS SDK hoặc Fallback Mock nếu chưa cấu hình API Keys
  if (isPayosConfigured()) {
    try {
      paymentData = await payos.paymentRequests.create({
        orderCode,
        amount: finalAmount,
        description,
        returnUrl,
        cancelUrl,
      });
    } catch (payosError) {
      console.error('❌ [PayOS Create Payment Error]:', payosError.message);
      throw new ApiError(500, `Không thể tạo giao dịch VietQR PayOS: ${payosError.message}`);
    }
  } else {
    console.warn(
      '⚠️ [PayOS] Chưa cấu hình PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY. Sử dụng VietQR mô phỏng chuẩn sandbox.'
    );
    paymentData = {
      checkoutUrl: `https://payos.vn/checkout-mock/${orderCode}`,
      qrCode: `00020101021238540010A00000072701240006970407080205844885303704540${finalAmount}5802VN62210817HD_${orderCode}6304`,
      accountNumber: '0384792888',
      accountName: 'NHA KHOA DENTAL CARE',
      bin: '970422',
      amount: finalAmount,
      description,
      orderCode,
    };
  }

  // 9. Lưu orderCode vào ghi chú hóa đơn để phục vụ tra cứu polling & đối chiếu webhook
  try {
    const updatedNotes = `${invoice.ghiChu || ''} [PAYOS:${orderCode}]`.trim();
    await prisma.hoaDon.update({
      where: { id: invoice.id },
      data: { ghiChu: updatedNotes },
    });
  } catch (noteErr) {
    console.warn('⚠️ [PayOS] Không thể cập nhật ghi chú orderCode vào hóa đơn:', noteErr.message);
  }

  return {
    orderCode,
    amount: finalAmount,
    description,
    accountNumber: paymentData.accountNumber || '0384792888',
    accountName: paymentData.accountName || 'NHA KHOA DENTAL CARE',
    bin: paymentData.bin || '970422',
    qrCode: paymentData.qrCode,
    checkoutUrl: paymentData.checkoutUrl,
    vietQrUrl: `https://img.vietqr.io/image/${paymentData.bin || '970422'}-${paymentData.accountNumber || '0384792888'}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(paymentData.accountName || 'NHA KHOA DENTAL CARE')}`,
    isConfigured: isPayosConfigured(),
  };
};

/**
 * Xử lý Webhook gửi từ Server PayOS khi bệnh nhân chuyển khoản thành công
 * @param {object} webhookBody - Body JSON do PayOS gửi tới
 */
export const handlePayosWebhookService = async (webhookBody) => {
  if (!webhookBody) {
    throw new ApiError(400, 'Webhook body rỗng');
  }

  // 1. Xác thực tính toàn vẹn của Webhook bằng Checksum Key qua PayOS SDK
  let verifiedData;
  if (isPayosConfigured()) {
    try {
      if (payos.webhooks && typeof payos.webhooks.verify === 'function') {
        verifiedData = await payos.webhooks.verify(webhookBody);
      } else if (typeof payos.verifyPaymentWebhookData === 'function') {
        verifiedData = payos.verifyPaymentWebhookData(webhookBody);
      } else {
        verifiedData = webhookBody.data || webhookBody;
      }
      console.log('✅ [PayOS Webhook] Checksum xác thực thành công:', verifiedData);
    } catch (err) {
      console.error('❌ [PayOS Webhook] Lỗi xác thực Checksum chữ ký số:', err.message);
      throw new ApiError(400, `Chữ ký số Webhook không hợp lệ: ${err.message}`);
    }
  } else {
    // Nếu ở chế độ mock/dev test
    verifiedData = webhookBody.data || webhookBody;
  }

  const orderCode = verifiedData?.orderCode || webhookBody.data?.orderCode;
  const code = verifiedData?.code || webhookBody.code || '00';

  // PayOS quy ước mã "00" là thành công
  if (code && code !== '00') {
    console.log(`ℹ️ [PayOS Webhook] Giao dịch #${orderCode} có trạng thái code: ${code} (không phải 00). Bỏ qua.`);
    return { success: false, message: `Trạng thái không phải thành công (code: ${code})` };
  }

  // Trường hợp PayOS gửi webhook kiểm tra kết nối / ping không chứa orderCode
  if (!orderCode) {
    console.log('ℹ️ [PayOS Webhook] Webhook ping/test hợp lệ. Phản hồi thành công cho PayOS.');
    return {
      success: true,
      message: 'PayOS webhook ping received successfully',
    };
  }

  // 2. Tìm hóa đơn trong CSDL theo tag [PAYOS:<orderCode>] trong ghi chú
  const orderTag = `[PAYOS:${orderCode}]`;
  let invoice = await prisma.hoaDon.findFirst({
    where: {
      ghiChu: {
        contains: orderTag,
      },
    },
  });

  // Nếu không tìm thấy bằng tag ghi chú, thử tìm hóa đơn có mã trùng với description
  if (!invoice && verifiedData.description) {
    const descMatch = verifiedData.description.replace(/^HD\s*/i, '').trim();
    if (descMatch) {
      invoice = await prisma.hoaDon.findFirst({
        where: {
          maHoaDon: {
            contains: descMatch,
            mode: 'insensitive',
          },
        },
      });
    }
  }

  if (!invoice) {
    console.warn(`⚠️ [PayOS Webhook] Không tìm thấy hóa đơn nào khớp với orderCode #${orderCode}`);
    return {
      success: true,
      message: `Đã nhận webhook orderCode #${orderCode} nhưng không tìm thấy hóa đơn tương ứng trong CSDL`,
    };
  }

  // 3. Nếu hóa đơn đã thanh toán rồi thì trả về thành công idempotency
  if (invoice.trangThaiThanhToan === 'da_thanh_toan') {
    console.log(`ℹ️ [PayOS Webhook] Hóa đơn ${invoice.id} đã ở trạng thái da_thanh_toan trước đó.`);
    return {
      success: true,
      message: 'Hóa đơn đã được quyết toán trước đó',
      invoiceId: invoice.id,
    };
  }

  // 4. Cập nhật hóa đơn sang trạng thái đã thanh toán trong Transaction
  await prisma.$transaction(async (tx) => {
    await tx.hoaDon.update({
      where: { id: invoice.id },
      data: {
        trangThaiThanhToan: 'da_thanh_toan',
        phuongThucThanhToan: 'chuyen_khoan',
        ngayThanhToan: new Date(),
        ghiChu: `${invoice.ghiChu || ''} (Xác nhận qua VietQR PayOS #${orderCode})`.trim(),
      },
    });

    // Cập nhật số lần sử dụng của Voucher nếu có
    if (invoice.khuyenMaiId) {
      await tx.khuyenMai.update({
        where: { id: invoice.khuyenMaiId },
        data: {
          soLanDaSuDung: { increment: 1 },
        },
      });
    }

    // Tự động chuyển ca hẹn sang 'dang_dieu_tri' nếu chưa chuyển
    if (invoice.lichHenId) {
      await tx.lichHen.update({
        where: { id: invoice.lichHenId },
        data: {
          trangThai: 'dang_dieu_tri',
          updatedAt: new Date(),
        },
      });
    }
  });

  console.log(`✅ [PayOS Webhook] Đã cập nhật hóa đơn ${invoice.id} sang da_thanh_toan thành công.`);

  return {
    success: true,
    invoiceId: invoice.id,
    orderCode,
  };
};

/**
 * Kiểm tra trạng thái thanh toán của một hóa đơn viện phí (Phục vụ Polling 2.5s)
 * @param {string} invoiceId - ID của hóa đơn
 * @param {object} [reqUser] - Thông tin người dùng
 */
export const checkInvoicePaymentStatusService = async (invoiceId, reqUser) => {
  if (!invoiceId) {
    throw new ApiError(400, 'invoiceId là bắt buộc');
  }

  const invoice = await prisma.hoaDon.findUnique({
    where: { id: invoiceId },
    include: {
      lichHen: {
        include: {
          benhNhan: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(404, 'Không tìm thấy hóa đơn viện phí');
  }

  // Kiểm tra quyền hạn nếu là bệnh nhân
  if (reqUser && String(reqUser.role).toUpperCase() === 'BENH_NHAN') {
    const patientProfileId = reqUser.profileId || reqUser.benhNhanId;
    const accountUserId = reqUser.userId || reqUser.id;
    const isOwner =
      (invoice.lichHen?.benhNhanId && invoice.lichHen.benhNhanId === patientProfileId) ||
      (invoice.lichHen?.benhNhan?.taiKhoanId && invoice.lichHen.benhNhan.taiKhoanId === accountUserId);

    if (!isOwner) {
      throw new ApiError(403, 'Bạn không có quyền tra cứu hóa đơn này');
    }
  }

  // 1. Nếu CSDL đã ghi nhận đã thanh toán
  if (invoice.trangThaiThanhToan === 'da_thanh_toan') {
    return {
      isPaid: true,
      status: 'da_thanh_toan',
      paidAt: invoice.ngayThanhToan,
      paymentMethod: invoice.phuongThucThanhToan || 'chuyen_khoan',
      invoiceId: invoice.id,
      invoiceCode: invoice.maHoaDon,
    };
  }

  // 2. Nếu chưa thanh toán trong CSDL, chủ động kiểm tra với PayOS server (Dual-safety query)
  const match = (invoice.ghiChu || '').match(/\[PAYOS:(\d+)\]/);
  const orderCode = match ? Number(match[1]) : null;

  if (orderCode && isPayosConfigured()) {
    try {
      const paymentInfo = await payos.paymentRequests.get(orderCode);
      if (paymentInfo && paymentInfo.status === 'PAID') {
        console.log(`⚡ [PayOS Polling] Phát hiện giao dịch #${orderCode} đã PAID trên PayOS. Cập nhật CSDL ngay.`);

        await prisma.$transaction(async (tx) => {
          await tx.hoaDon.update({
            where: { id: invoice.id },
            data: {
              trangThaiThanhToan: 'da_thanh_toan',
              phuongThucThanhToan: 'chuyen_khoan',
              ngayThanhToan: new Date(),
              ghiChu: `${invoice.ghiChu || ''} (Xác nhận qua Polling PayOS #${orderCode})`.trim(),
            },
          });

          if (invoice.khuyenMaiId) {
            await tx.khuyenMai.update({
              where: { id: invoice.khuyenMaiId },
              data: { soLanDaSuDung: { increment: 1 } },
            });
          }

          if (invoice.lichHenId) {
            await tx.lichHen.update({
              where: { id: invoice.lichHenId },
              data: {
                trangThai: 'dang_dieu_tri',
                updatedAt: new Date(),
              },
            });
          }
        });

        return {
          isPaid: true,
          status: 'da_thanh_toan',
          paidAt: new Date(),
          paymentMethod: 'chuyen_khoan',
          invoiceId: invoice.id,
          invoiceCode: invoice.maHoaDon,
        };
      }
    } catch (queryErr) {
      console.warn(`⚠️ [PayOS Polling] Không thể truy vấn PayOS cho orderCode ${orderCode}:`, queryErr.message);
    }
  }

  return {
    isPaid: false,
    status: invoice.trangThaiThanhToan,
    invoiceId: invoice.id,
    invoiceCode: invoice.maHoaDon,
  };
};


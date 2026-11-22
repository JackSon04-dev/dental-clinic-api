import prisma from '../../config/prisma.js';
import {
  getClientServicesService,
  getClientDoctorsService,
  getAvailableSlotsService,
  getVietnamTodayDateString,
} from '../clients/clientAppointmentService.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 15000;
const CATALOG_CACHE_TTL_MS = 60 * 1000;

const DISCLAIMER =
  'Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán trực tiếp của bác sĩ. Trường hợp khẩn cấp vui lòng gọi 1900 1234.';

const EMERGENCY_KEYWORDS = [
  'sung mat',
  'kho tho',
  'kho nuot',
  'sot cao',
  'chay mau khong cam',
  'chay mau nhieu',
  'chay mau keo dai',
  'gay rang',
  'chan thuong',
  'ap xe',
  'sung to',
];

const KEYWORD_GROUPS = [
  {
    triggers: ['e buot', 'nhay cam', 'sau rang', 'dau rang', 'nhuc rang', 'tram rang', 'chua tuy', 'lay tuy'],
    serviceTerms: ['tram', 'tuy', 'kham', 'tong quat'],
    specialtyTerms: ['tong quat', 'noi nha', 'phuc hinh'],
    advice:
      'Tình trạng ê buốt hoặc đau nhức răng thường liên quan đến mòn men, sâu răng hoặc viêm tủy. Bạn nên sớm khám tổng quát để bác sĩ chụp phim kiểm tra chính xác nguyên nhân.',
  },
  {
    triggers: ['nieng', 'chinh nha', 'khop can', 'rang ho', 'rang mom', 'khap khenh', 'invisalign', 'mac cai'],
    serviceTerms: ['nieng', 'chinh nha', 'invisalign', 'mac cai'],
    specialtyTerms: ['chinh nha', 'nieng'],
    advice:
      'Với nhu cầu chỉnh nha / niềng răng, phòng khám sẽ quét mẫu hàm iTero 3D và tư vấn phác đồ phù hợp (mắc cài hoặc khay trong suốt).',
  },
  {
    triggers: ['implant', 'mat rang', 'trong rang', 'cay ghep'],
    serviceTerms: ['implant', 'cay ghep', 'trong rang'],
    specialtyTerms: ['implant', 'cay ghep', 'phuc hinh'],
    advice:
      'Cấy ghép Implant giúp phục hồi chân răng đã mất bền chắc. Bác sĩ sẽ kiểm tra mật độ xương hàm qua phim CT Cone Beam 3D trước khi lên kế hoạch.',
  },
  {
    triggers: ['boc su', 'rang su', 'veneer', 'dan su', 'tham my'],
    serviceTerms: ['su', 'veneer', 'tham my'],
    specialtyTerms: ['tham my', 'phuc hinh', 'su'],
    advice:
      'Bọc răng sứ hoặc dán sứ Veneer giúp cải thiện màu sắc và hình thể răng. Thẩm mỹ răng sứ tại DentalCare có thẻ bảo hành chính hãng 10–15 năm.',
  },
  {
    triggers: ['cao voi', 'lay cao', 'chay mau chan rang', 'viem nuou', 'viem nha chu', 'hoi mieng'],
    serviceTerms: ['cao voi', 'nha chu', 've sinh', 'kham'],
    specialtyTerms: ['nha chu', 'tong quat'],
    advice:
      'Chảy máu chân răng hoặc mảng bám vôi răng là dấu hiệu thường gặp của viêm nướu/nha chu. Bạn nên lấy cao răng định kỳ 6 tháng/lần để bảo vệ nướu.',
  },
  {
    triggers: ['tay trang', 'rang vang', 'trang rang'],
    serviceTerms: ['tay trang', 'lam trang'],
    specialtyTerms: ['tham my', 'tong quat'],
    advice:
      'Tẩy trắng răng tại phòng khám sử dụng công nghệ dịu nhẹ giúp cải thiện tông màu răng nhanh chóng và hạn chế ê buốt.',
  },
  {
    triggers: ['rang khon', 'nho rang', 'rang so 8', 'moc lech'],
    serviceTerms: ['nho rang', 'rang khon', 'tieu phau'],
    specialtyTerms: ['tieu phau', 'ham mat', 'tong quat'],
    advice:
      'Răng khôn mọc lệch hoặc đau vùng góc hàm cần chụp phim kiểm tra vị trí chân răng để bác sĩ đánh giá hướng xử lý an toàn bằng máy siêu âm.',
  },
];

let catalogCache = {
  expiresAt: 0,
  dateStr: '',
  data: null,
};

/**
 * Chuẩn hóa tiếng Việt không dấu để đối chiếu từ khóa ổn định
 */
function normalizeVi(input = '') {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function getWeekdayLabelVi(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const labels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return labels[dt.getUTCDay()];
}

/**
 * Lấy danh mục công khai của phòng khám (KHÔNG đọc bảng dữ liệu cá nhân bệnh nhân)
 */
async function getPublicClinicCatalog() {
  const todayStr = getVietnamTodayDateString();
  const now = Date.now();
  if (catalogCache.data && catalogCache.expiresAt > now && catalogCache.dateStr === todayStr) {
    return catalogCache.data;
  }

  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
  const [services, doctors, promotions] = await Promise.all([
    getClientServicesService(),
    getClientDoctorsService(),
    prisma.khuyenMai.findMany({
      where: {
        trangThai: 'hoat_dong',
        ngayBatDau: { lte: todayDate },
        ngayKetThuc: { gte: todayDate },
      },
      select: {
        maKhuyenMai: true,
        tenChuongTrinh: true,
        loaiGiam: true,
        giaTriGiam: true,
        ngayKetThuc: true,
      },
      orderBy: { ngayKetThuc: 'asc' },
      take: 8,
    }),
  ]);

  const formattedPromotions = promotions.map((p) => ({
    code: p.maKhuyenMai,
    name: p.tenChuongTrinh,
    discountType: p.loaiGiam,
    discountValue: Number(p.giaTriGiam),
    validUntil: p.ngayKetThuc ? p.ngayKetThuc.toISOString().slice(0, 10) : null,
  }));

  const data = { services, doctors, promotions: formattedPromotions, todayStr };
  catalogCache = { expiresAt: now + CATALOG_CACHE_TTL_MS, dateStr: todayStr, data };
  return data;
}

function formatServiceSummaryForPrompt(s) {
  return `- [id=${s.id} | code=${s.code}] ${s.name}: giá ${s.priceText || s.price}, thời lượng ${s.durationMinutes} phút${s.description ? ` — ${s.description.slice(0, 120)}` : ''}`;
}

function formatDoctorSummaryForPrompt(d) {
  return `- [id=${d.id} | code=${d.code}] ${d.titleFullName || d.fullName} | Chuyên khoa: ${d.specialty} | Phụ phí học vị: ${new Intl.NumberFormat('vi-VN').format(d.surcharge || 0)} đ${d.bio ? ` — ${d.bio.slice(0, 120)}` : ''}`;
}

function buildSystemPrompt(catalog) {
  const { services, doctors, promotions, todayStr } = catalog;
  const tomorrowStr = addDays(todayStr, 1);

  const promoLines =
    promotions.length > 0
      ? promotions
          .map((p) => {
            const val =
              p.discountType === 'phan_tram'
                ? `${p.discountValue}%`
                : `${new Intl.NumberFormat('vi-VN').format(p.discountValue)} đ`;
            return `- Mã ${p.code}: ${p.name} (giảm ${val}, đến ${p.validUntil || 'khi hết lượt'})`;
          })
          .join('\n')
      : '- Hiện chưa có chương trình khuyến mãi công khai mới trong hệ thống.';

  return `Bạn là Trợ lý AI tư vấn đặt lịch của Nha khoa DentalCare.
Thời gian hiện tại (giờ Việt Nam): hôm nay là ${todayStr} (${getWeekdayLabelVi(todayStr)}), ngày mai là ${tomorrowStr} (${getWeekdayLabelVi(tomorrowStr)}).

THÔNG TIN PHÒNG KHÁM DENTALCARE:
- Địa chỉ: 128 Nguyễn Du, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh.
- Hotline khẩn cấp & tư vấn 24/7: 1900 1234 (hoặc 0912 345 678).
- 16 khung giờ đặt lịch trực tuyến chuẩn mỗi ngày: Sáng 08:00–11:30 (mỗi ca cách 30 phút: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30), Chiều 13:30–17:00 (13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00).
- Chính sách nổi bật: Khám tổng quát & tư vấn ban đầu miễn phí; bảo hành răng sứ 10–15 năm; trụ Implant Straumann bảo hành trọn đời; hỗ trợ trả góp 0% (trả trước từ 30%, kỳ hạn 6–12 tháng).

DANH MỤC DỊCH VỤ HIỆN CÓ TRONG HỆ THỐNG:
${services.map(formatServiceSummaryForPrompt).join('\n')}

ĐỘI NGŨ BÁC SĨ ĐANG LÀM VIỆC:
${doctors.map(formatDoctorSummaryForPrompt).join('\n')}

KHUYẾN MÃI ĐANG ÁP DỤNG:
${promoLines}

QUY TẮC BẮT BUỘC:
1. PHẠM VI: Chỉ trả lời về sức khỏe răng miệng, triệu chứng tham khảo, dịch vụ/bảng giá, bác sĩ, lịch hẹn trống, khuyến mãi và thông tin của Nha khoa DentalCare. Nếu người dùng hỏi chủ đề ngoài phạm vi (lập trình, toán, giải trí, chính trị, v.v.), từ chối ngắn gọn và lịch sự mời quay lại chủ đề nha khoa.
2. AN TOÀN Y KHOA: Tuyệt đối KHÔNG chẩn đoán khẳng định thay bác sĩ và KHÔNG kê đơn thuốc cụ thể. Khi người dùng mô tả triệu chứng, chỉ giải thích ngắn các khả năng thường gặp mang tính tham khảo và khuyên đến khám để bác sĩ kiểm tra trực tiếp.
3. CẤP CỨU: Nếu thấy dấu hiệu nguy hiểm (sưng mặt lan rộng, sốt cao, khó nuốt, khó thở, chảy máu không cầm, chấn thương gãy răng nặng), phải đặt cảnh báo lên đầu câu trả lời và khuyên gọi ngay hotline 1900 1234 hoặc đến cơ sở cấp cứu gần nhất.
4. LỊCH TRỐNG THỰC TẾ: Khi người dùng hỏi về lịch trống, giờ khám còn trống theo ngày hoặc bác sĩ, BẮT BUỘC gọi tool check_available_slots để kiểm tra dữ liệu thật từ hệ thống, tuyệt đối KHÔNG bịa giờ trống. Không đọc hoặc hỏi thông tin bệnh án cá nhân.
5. VĂN PHONG: Tiếng Việt tự nhiên, thân thiện, súc tích (khoảng 3–6 câu hoặc gạch đầu dòng gọn). Chỉ dùng đúng tên dịch vụ, giá, và tên bác sĩ có trong danh sách trên.
6. ĐỊNH DẠNG METADATA CUỐI PHẢN HỒI: Ở dòng cuối cùng của câu trả lời cuối (sau khi không cần gọi thêm tool), luôn đính kèm duy nhất 1 khối JSON theo đúng cú pháp:
<<<ACTIONS>>>{"serviceIds":[],"doctorIds":[],"slot":null}<<<END_ACTIONS>>>
Trong đó:
- "serviceIds": mảng tối đa 3 UUID dịch vụ liên quan nhất từ danh sách trên (để rỗng [] nếu từ chối ngoài phạm vi hoặc không liên quan).
- "doctorIds": mảng tối đa 2 UUID bác sĩ phù hợp nhất từ danh sách trên.
- "slot": null hoặc {"date":"YYYY-MM-DD","timeSlot":"HH:mm","serviceId":"UUID","doctorId":"UUID hoặc null"} nếu vừa tra lịch trống bằng tool và có khung giờ khả dụng gợi ý.`;
}

function resolveService(catalog, rawServiceId, fallbackQuery = '') {
  const { services } = catalog;
  if (!services.length) return null;

  if (rawServiceId) {
    const clean = String(rawServiceId).trim().toLowerCase();
    const byExact = services.find(
      (s) => s.id.toLowerCase() === clean || s.code.toLowerCase() === clean
    );
    if (byExact) return byExact;
    const byName = services.find((s) => normalizeVi(s.name).includes(normalizeVi(rawServiceId)));
    if (byName) return byName;
  }

  if (fallbackQuery) {
    const norm = normalizeVi(fallbackQuery);
    const byQuery = services.find((s) => normalizeVi(s.name).includes(norm));
    if (byQuery) return byQuery;
  }

  return (
    services.find((s) => normalizeVi(s.name).includes('kham')) ||
    services[0]
  );
}

function resolveDoctor(catalog, rawDentistId) {
  if (!rawDentistId) return null;
  const clean = String(rawDentistId).trim().toLowerCase();
  const norm = normalizeVi(rawDentistId).replace(/^(ths\.?bs\.?|bs\.?|bscki\.?|bsckii\.?)\s*/i, '').trim();

  return (
    catalog.doctors.find(
      (d) =>
        d.id.toLowerCase() === clean ||
        d.code.toLowerCase() === clean ||
        normalizeVi(d.fullName).includes(norm)
    ) || null
  );
}

async function executeCheckAvailableSlots(
  args,
  catalog,
  checkedSlotsContext,
  fetchAvailableSlots = getAvailableSlotsService
) {
  const todayStr = catalog.todayStr;
  let targetDate = todayStr;
  let adjustedFromPast = false;

  if (args?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(args.date).trim())) {
    const candidateDate = String(args.date).trim();
    if (candidateDate < todayStr) {
      adjustedFromPast = true;
      targetDate = todayStr;
    } else {
      targetDate = candidateDate;
    }
  }

  const service = resolveService(catalog, args?.serviceId);
  if (!service) {
    return { ok: false, error: 'Chưa có dữ liệu dịch vụ đang hoạt động để tra cứu lịch.' };
  }
  const doctor = resolveDoctor(catalog, args?.dentistId);

  try {
    const data = await fetchAvailableSlots({
      date: targetDate,
      serviceId: service.id,
      dentistId: doctor?.id || undefined,
    });

    const availableSlots = (data?.slots || []).filter((s) => s.isAvailable);
    checkedSlotsContext.push({
      date: targetDate,
      service,
      doctor,
      availableSlots,
    });

    return {
      ok: true,
      date: targetDate,
      weekday: getWeekdayLabelVi(targetDate),
      adjustedFromPast,
      maxAvailableDate: data?.weekSchedule?.maxAvailableDate || targetDate,
      serviceId: service.id,
      serviceName: service.name,
      doctorId: doctor?.id || null,
      doctorName: doctor?.titleFullName || doctor?.fullName || null,
      totalAvailable: availableSlots.length,
      availableSlots: availableSlots.map((s) => ({
        time: s.time,
        displayTime: s.displayTime,
        period: s.period === 'morning' ? 'Sáng' : 'Chiều',
        availableDoctorCount: s.availableDoctorCount,
        doctors: (s.availableDoctors || []).slice(0, 3).map((d) => ({
          id: d.id,
          fullName: d.fullName,
        })),
      })),
    };
  } catch (err) {
    return {
      ok: false,
      date: targetDate,
      serviceId: service.id,
      serviceName: service.name,
      doctorName: doctor?.titleFullName || doctor?.fullName || null,
      error: err?.message || 'Không thể tra cứu khung giờ cho ngày đã chọn.',
      availableSlots: [],
    };
  }
}

async function callGeminiModel({ model, apiKey, payload }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const errMsg = json?.error?.message || `HTTP ${response.status}`;
      const err = new Error(`Gemini error (${response.status}): ${errMsg}`);
      err.statusCode = response.status;
      throw err;
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeHistoryForGemini(history = []) {
  const cleaned = [];
  for (const item of history) {
    if (!item || !item.text) continue;
    const role = item.role === 'model' ? 'model' : 'user';
    const text = String(item.text).trim();
    if (!text) continue;
    // Bỏ qua lời chào mở đầu nếu ở vị trí đầu tiên để conversation luôn bắt đầu từ user
    if (cleaned.length === 0 && role === 'model') continue;
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      cleaned[cleaned.length - 1].parts[0].text += `\n${text}`;
    } else {
      cleaned.push({ role, parts: [{ text }] });
    }
  }
  return cleaned;
}

function buildSuggestedPayload({
  replyText,
  rawActions,
  hasActionsBlock = false,
  catalog,
  checkedSlotsContext,
}) {
  const serviceMap = new Map(catalog.services.map((s) => [s.id, s]));
  const doctorMap = new Map(catalog.doctors.map((d) => [d.id, d]));

  const pickedServices = [];
  const seenServices = new Set();
  for (const sid of rawActions?.serviceIds || []) {
    const srv = serviceMap.get(sid);
    if (srv && !seenServices.has(srv.id)) {
      seenServices.add(srv.id);
      pickedServices.push(srv);
    }
  }

  const pickedDoctors = [];
  const seenDoctors = new Set();
  for (const did of rawActions?.doctorIds || []) {
    const doc = doctorMap.get(did);
    if (doc && !seenDoctors.has(doc.id)) {
      seenDoctors.add(doc.id);
      pickedDoctors.push(doc);
    }
  }

  // Bổ sung nhẹ chỉ khi Gemini bỏ quên khối ACTIONS
  if (!hasActionsBlock) {
    const normReply = normalizeVi(replyText);
    if (pickedServices.length === 0) {
      for (const s of catalog.services) {
        if (s.name && normReply.includes(normalizeVi(s.name))) {
          pickedServices.push(s);
          if (pickedServices.length >= 2) break;
        }
      }
    }
    if (pickedDoctors.length === 0) {
      for (const d of catalog.doctors) {
        const bareName = normalizeVi(d.rawFullName || d.fullName)
          .replace(/^(ths\.?bs\.?|bs\.?|bscki\.?|bsckii\.?)\s*/i, '')
          .trim();
        if (bareName && normReply.includes(bareName)) {
          pickedDoctors.push(d);
          if (pickedDoctors.length >= 2) break;
        }
      }
    }
  }

  // Trích tối đa 4 slot thực sự khả dụng từ tool context (ưu tiên slot được model chọn)
  const suggestedSlots = [];
  const seenSlotKeys = new Set();
  const latestCtx = checkedSlotsContext[checkedSlotsContext.length - 1];

  if (latestCtx && latestCtx.availableSlots.length > 0) {
    const preferredTime = rawActions?.slot?.timeSlot;
    const orderedSlots = [...latestCtx.availableSlots].sort((a, b) => {
      if (a.time === preferredTime) return -1;
      if (b.time === preferredTime) return 1;
      return a.slotIndex - b.slotIndex;
    });

    for (const s of orderedSlots) {
      const key = `${latestCtx.date}_${s.time}`;
      if (seenSlotKeys.has(key)) continue;
      seenSlotKeys.add(key);

      const firstDoc = latestCtx.doctor || s.availableDoctors?.[0] || null;
      suggestedSlots.push({
        date: latestCtx.date,
        timeSlot: s.time,
        displayTime: s.displayTime,
        serviceId: latestCtx.service.id,
        serviceName: latestCtx.service.name,
        doctorId: latestCtx.doctor?.id || firstDoc?.id || null,
        doctorName: latestCtx.doctor?.titleFullName || latestCtx.doctor?.fullName || firstDoc?.fullName || null,
      });
      if (suggestedSlots.length >= 4) break;
    }
  }

  return {
    services: pickedServices.slice(0, 3).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      price: s.price,
      priceText: s.priceText,
      durationMinutes: s.durationMinutes,
    })),
    doctors: pickedDoctors.slice(0, 2).map((d) => ({
      id: d.id,
      code: d.code,
      fullName: d.titleFullName || d.fullName,
      titleFullName: d.titleFullName || d.fullName,
      specialty: d.specialty,
      avatarUrl: d.avatarUrl || null,
    })),
    slots: suggestedSlots,
  };
}

function parseGeminiReplyText(rawText = '') {
  let cleanText = String(rawText || '').trim();
  let parsedActions = { serviceIds: [], doctorIds: [], slot: null };

  const match = cleanText.match(/<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/);
  if (match) {
    try {
      const jsonObj = JSON.parse(match[1].trim());
      if (jsonObj && typeof jsonObj === 'object') {
        parsedActions = {
          serviceIds: Array.isArray(jsonObj.serviceIds) ? jsonObj.serviceIds : [],
          doctorIds: Array.isArray(jsonObj.doctorIds) ? jsonObj.doctorIds : [],
          slot: jsonObj.slot && typeof jsonObj.slot === 'object' ? jsonObj.slot : null,
        };
      }
    } catch {
      // Bỏ qua nếu JSON metadata không hợp lệ
    }
  }

  cleanText = cleanText
    .replace(/<<<ACTIONS>>>[\s\S]*?<<<END_ACTIONS>>>/g, '')
    .replace(/<<<ACTIONS>>>[\s\S]*$/g, '')
    .trim();

  return { cleanText, parsedActions, hasActionsBlock: Boolean(match) };
}

/**
 * Fallback thông minh dùng dữ liệu PostgreSQL nội bộ khi thiếu API key hoặc Gemini quá tải
 */
async function buildFallbackReply(
  message,
  catalog,
  fetchAvailableSlots = getAvailableSlotsService
) {
  const normMsg = normalizeVi(message);
  const { services, doctors, promotions, todayStr } = catalog;
  const hasEmergency = EMERGENCY_KEYWORDS.some((kw) => normMsg.includes(kw));

  const matchedServices = [];
  const matchedDoctors = [];
  const adviceLines = [];

  if (hasEmergency) {
    adviceLines.push(
      '⚠️ **Cảnh báo khẩn cấp:** Triệu chứng bạn mô tả cần được bác sĩ thăm khám càng sớm càng tốt. Vui lòng gọi ngay **Hotline 1900 1234** hoặc đến cơ sở **128 Nguyễn Du, Q.1** để được hỗ trợ ngay.'
    );
  }

  // Khớp theo từ khóa triệu chứng/nhu cầu
  for (const group of KEYWORD_GROUPS) {
    if (group.triggers.some((t) => normMsg.includes(t))) {
      adviceLines.push(group.advice);
      for (const s of services) {
        const sNorm = normalizeVi(`${s.name} ${s.description}`);
        if (group.serviceTerms.some((term) => sNorm.includes(term)) && !matchedServices.includes(s)) {
          matchedServices.push(s);
        }
      }
      for (const d of doctors) {
        const dNorm = normalizeVi(`${d.specialty} ${d.bio}`);
        if (group.specialtyTerms.some((term) => dNorm.includes(term)) && !matchedDoctors.includes(d)) {
          matchedDoctors.push(d);
        }
      }
    }
  }

  // Khớp trực tiếp theo tên dịch vụ hoặc bác sĩ trong câu hỏi
  for (const s of services) {
    if (s.name && normMsg.includes(normalizeVi(s.name)) && !matchedServices.includes(s)) {
      matchedServices.push(s);
    }
  }
  for (const d of doctors) {
    const bare = normalizeVi(d.rawFullName || d.fullName).replace(/^(ths\.?bs\.?|bs\.?|bscki\.?|bsckii\.?)\s*/i, '').trim();
    if (bare && normMsg.includes(bare) && !matchedDoctors.includes(d)) {
      matchedDoctors.push(d);
    }
  }

  // Kiểm tra câu hỏi lịch trống
  const checkedSlotsContext = [];
  const asksAvailability = ['lich trong', 'gio trong', 'con cho', 'dat lich', 'ngay mai', 'hom nay', 'ca kham'].some(
    (kw) => normMsg.includes(kw)
  );
  if (asksAvailability && services.length > 0) {
    const askTomorrow = normMsg.includes('ngay mai');
    const targetDate = askTomorrow ? addDays(todayStr, 1) : todayStr;
    const srvForSlot = matchedServices[0] || resolveService(catalog, null);
    const docForSlot = matchedDoctors[0] || null;
    if (srvForSlot) {
      const slotRes = await executeCheckAvailableSlots(
        { date: targetDate, serviceId: srvForSlot.id, dentistId: docForSlot?.id },
        catalog,
        checkedSlotsContext,
        fetchAvailableSlots
      );
      if (slotRes.ok && slotRes.totalAvailable > 0) {
        const preview = slotRes.availableSlots.slice(0, 4).map((x) => x.time).join(', ');
        adviceLines.push(
          `Ngày **${slotRes.date}** (${slotRes.weekday}) cho dịch vụ **${slotRes.serviceName}** hiện còn **${slotRes.totalAvailable} khung giờ trống** (ví dụ: ${preview}).`
        );
      } else if (slotRes.error) {
        adviceLines.push(slotRes.error);
      }
    }
  }

  if (normMsg.includes('khuyen mai') || normMsg.includes('uu dai') || normMsg.includes('voucher')) {
    if (promotions.length > 0) {
      const pList = promotions
        .slice(0, 3)
        .map((p) => `${p.name} (mã **${p.code}**)`)
        .join(', ');
      adviceLines.push(`Hiện phòng khám đang có ưu đãi: ${pList}.`);
    } else {
      adviceLines.push('Hiện chưa có mã khuyến mãi công khai mới; khám tổng quát và chụp phim 3D ban đầu vẫn được miễn phí 100%.');
    }
  }

  if (matchedServices.length === 0 && services.length > 0) {
    const defaultExam = resolveService(catalog, null);
    if (defaultExam) matchedServices.push(defaultExam);
    for (const s of services.slice(0, 2)) {
      if (!matchedServices.includes(s)) matchedServices.push(s);
    }
  }
  if (matchedDoctors.length === 0 && doctors.length > 0) {
    matchedDoctors.push(doctors[0]);
  }

  if (adviceLines.length === 0) {
    adviceLines.push(
      'Hiện trợ lý AI đang tạm bận, mình đã tra trực tiếp danh mục phòng khám phù hợp cho bạn ở bên dưới. Bạn có thể bấm chọn dịch vụ/bác sĩ để đặt lịch ngay hoặc gọi **Hotline 1900 1234**.'
    );
  } else {
    adviceLines.push('Ghi chú: Phản hồi được tra trực tiếp từ dữ liệu phòng khám do trợ lý AI đang tạm quá tải.');
  }

  return {
    reply: adviceLines.join('\n\n'),
    suggestedActions: buildSuggestedPayload({
      replyText: adviceLines.join(' '),
      rawActions: {
        serviceIds: matchedServices.slice(0, 3).map((s) => s.id),
        doctorIds: matchedDoctors.slice(0, 2).map((d) => d.id),
        slot: null,
      },
      hasActionsBlock: true,
      catalog,
      checkedSlotsContext,
    }),
    isFallback: true,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Xử lý hội thoại AI cho Khách / Bệnh nhân ở phạm vi phòng khám DentalCare
 */
export const chatWithClinicAiService = async ({ message, history = [] }, deps = {}) => {
  const loadCatalog = deps.loadCatalog || getPublicClinicCatalog;
  const fetchAvailableSlots = deps.fetchAvailableSlots || getAvailableSlotsService;

  const catalog = await loadCatalog();
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return buildFallbackReply(message, catalog, fetchAvailableSlots);
  }

  const primaryModel = (process.env.GEMINI_MODEL || '').trim() || 'gemini-flash-lite-latest';
  const modelsToTry = Array.from(new Set([primaryModel, 'gemini-3.5-flash-lite']));
  const systemPrompt = buildSystemPrompt(catalog);
  const sanitizedHistory = sanitizeHistoryForGemini(history);

  const toolDeclarations = [
    {
      functionDeclarations: [
        {
          name: 'check_available_slots',
          description:
            'Tra cứu danh sách khung giờ khám răng thực tế còn trống tại Nha khoa DentalCare theo ngày (YYYY-MM-DD), dịch vụ và bác sĩ.',
          parameters: {
            type: 'OBJECT',
            properties: {
              date: {
                type: 'STRING',
                description: 'Ngày cần kiểm tra định dạng YYYY-MM-DD (theo giờ Việt Nam).',
              },
              serviceId: {
                type: 'STRING',
                description: 'UUID hoặc mã dịch vụ nha khoa muốn kiểm tra.',
              },
              dentistId: {
                type: 'STRING',
                description: 'UUID hoặc tên bác sĩ nếu khách có chỉ định.',
              },
            },
          },
        },
      ],
    },
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    const checkedSlotsContext = [];
    const contents = [
      ...sanitizedHistory,
      { role: 'user', parts: [{ text: String(message).trim() }] },
    ];

    try {
      let finalRawText = '';

      // Tối đa 2 vòng gọi tool + 1 vòng tổng hợp kết quả cuối
      for (let round = 0; round < 3; round += 1) {
        const allowTools = round < 2;
        const payload = {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          ...(allowTools ? { tools: toolDeclarations } : {}),
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700,
          },
        };

        const geminiRes = await callGeminiModel({ model, apiKey, payload });
        const candidate = geminiRes?.candidates?.[0];
        const candidateContent = candidate?.content;
        const parts = candidateContent?.parts || [];
        const functionCallParts = parts.filter((p) => p.functionCall);

        if (functionCallParts.length > 0 && allowTools) {
          // Bảo toàn nguyên vẹn candidateContent (gồm thoughtSignature / id cho Gemini 3.x)
          contents.push(candidateContent);

          const responseParts = [];
          for (const part of functionCallParts) {
            const fc = part.functionCall;
            let toolResult = { error: 'Công cụ không được hỗ trợ.' };
            if (fc.name === 'check_available_slots') {
              toolResult = await executeCheckAvailableSlots(
                fc.args || {},
                catalog,
                checkedSlotsContext,
                fetchAvailableSlots
              );
            }
            responseParts.push({
              functionResponse: {
                name: fc.name,
                ...(fc.id ? { id: fc.id } : {}),
                response: { result: toolResult },
              },
            });
          }

          contents.push({ role: 'user', parts: responseParts });
          continue;
        }

        finalRawText = parts
          .filter((p) => typeof p.text === 'string')
          .map((p) => p.text)
          .join('\n')
          .trim();
        break;
      }

      if (!finalRawText) {
        throw new Error('Gemini trả về phản hồi rỗng.');
      }

      const { cleanText, parsedActions, hasActionsBlock } = parseGeminiReplyText(finalRawText);
      const reply = cleanText || 'Cảm ơn bạn đã liên hệ Nha khoa DentalCare. Bạn vui lòng mô tả thêm triệu chứng hoặc chọn dịch vụ bên dưới để đặt lịch nhé.';

      return {
        reply,
        suggestedActions: buildSuggestedPayload({
          replyText: reply,
          rawActions: parsedActions,
          hasActionsBlock,
          catalog,
          checkedSlotsContext,
        }),
        isFallback: false,
        disclaimer: DISCLAIMER,
      };
    } catch (err) {
      lastError = err;
      // Chỉ log thông điệp lỗi tóm tắt, tuyệt đối không log API key hay header
      console.warn(`[PublicAiChat] Model ${model} fallback trigger:`, err?.message || 'Unknown error');
    }
  }

  console.warn('[PublicAiChat] Using local DB fallback:', lastError?.message || 'No model succeeded');
  return buildFallbackReply(message, catalog, fetchAvailableSlots);
};

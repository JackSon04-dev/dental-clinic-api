import prisma from '../../../config/prisma.js';
import { ApiError } from '../../../common/errorMiddleware.js';
import {
  adminRoomDetailResponseSchema,
  adminRoomListItemResponseSchema,
} from '../../../dtos/departments/admins/adminRoomDto.js';

/**
 * Sinh mã phòng khám ngẫu nhiên duy nhất nếu không được truyền
 */
const generateUniqueRoomCode = async () => {
  for (let i = 0; i < 5; i++) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const candidateCode = `PK-${randomSuffix}`;
    const existing = await prisma.phongDieuTri.findUnique({
      where: { maPhong: candidateCode },
      select: { id: true },
    });
    if (!existing) return candidateCode;
  }
  return `PK-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * getRoomsListService
 * Lấy danh sách phòng khám / phòng điều trị có phân trang, bộ lọc trạng thái và tìm kiếm
 */
export const getRoomsListService = async ({
  page = 1,
  limit = 10,
  status = 'ALL',
  search = '',
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (status && status !== 'ALL') {
    where.trangThai = status;
  }

  const cleanSearch = (search || '').trim();
  if (cleanSearch) {
    where.OR = [
      { tenPhong: { contains: cleanSearch, mode: 'insensitive' } },
      { maPhong: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  const [rawRooms, totalItems] = await Promise.all([
    prisma.phongDieuTri.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            caLamViec: true,
          },
        },
      },
    }),
    prisma.phongDieuTri.count({ where }),
  ]);

  const rooms = rawRooms.map(adminRoomListItemResponseSchema);
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    rooms,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    },
  };
};

/**
 * getRoomDetailService
 * Lấy chi tiết thông tin phòng khám theo UUID
 */
export const getRoomDetailService = async (id) => {
  const room = await prisma.phongDieuTri.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          caLamViec: true,
        },
      },
    },
  });

  if (!room) {
    throw new ApiError(404, 'Không tìm thấy thông tin phòng khám');
  }

  return adminRoomDetailResponseSchema(room);
};

/**
 * createRoomService
 * Thêm mới phòng khám (Level 0)
 */
export const createRoomService = async ({
  name,
  code,
  status = 'hoat_dong',
  note,
}) => {
  let roomCode = (code || '').trim().toUpperCase();

  if (roomCode) {
    const existing = await prisma.phongDieuTri.findUnique({
      where: { maPhong: roomCode },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, `Mã phòng khám '${roomCode}' đã tồn tại trong hệ thống`);
    }
  } else {
    roomCode = await generateUniqueRoomCode();
  }

  const newRoom = await prisma.phongDieuTri.create({
    data: {
      maPhong: roomCode,
      tenPhong: name.trim(),
      trangThai: status,
      ghiChu: note ? note.trim() : null,
    },
    include: {
      _count: {
        select: {
          caLamViec: true,
        },
      },
    },
  });

  return adminRoomDetailResponseSchema(newRoom);
};

/**
 * updateRoomService
 * Cập nhật thông tin phòng khám
 */
export const updateRoomService = async (id, data) => {
  const existingRoom = await prisma.phongDieuTri.findUnique({
    where: { id },
    select: { id: true, maPhong: true },
  });

  if (!existingRoom) {
    throw new ApiError(404, 'Không tìm thấy phòng khám để cập nhật');
  }

  const updateData = {};

  if (data.name !== undefined) {
    updateData.tenPhong = data.name.trim();
  }

  if (data.note !== undefined) {
    updateData.ghiChu = data.note ? data.note.trim() : null;
  }

  if (data.status !== undefined) {
    updateData.trangThai = data.status;
  }

  if (data.code !== undefined) {
    const newCode = data.code ? data.code.trim().toUpperCase() : null;
    if (newCode && newCode !== existingRoom.maPhong) {
      const codeCheck = await prisma.phongDieuTri.findUnique({
        where: { maPhong: newCode },
        select: { id: true },
      });
      if (codeCheck) {
        throw new ApiError(409, `Mã phòng khám '${newCode}' đã tồn tại trong hệ thống`);
      }
      updateData.maPhong = newCode;
    }
  }

  const updatedRoom = await prisma.phongDieuTri.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: {
          caLamViec: true,
        },
      },
    },
  });

  return adminRoomDetailResponseSchema(updatedRoom);
};

/**
 * updateRoomStatusService
 * Bật / tắt trạng thái hoạt động của phòng khám (hoat_dong <-> ngung_hoat_dong)
 */
export const updateRoomStatusService = async (id, status) => {
  const existingRoom = await prisma.phongDieuTri.findUnique({
    where: { id },
    select: { id: true, trangThai: true },
  });

  if (!existingRoom) {
    throw new ApiError(404, 'Không tìm thấy phòng khám để thay đổi trạng thái');
  }

  const updatedRoom = await prisma.phongDieuTri.update({
    where: { id },
    data: { trangThai: status },
    include: {
      _count: {
        select: {
          caLamViec: true,
        },
      },
    },
  });

  return adminRoomDetailResponseSchema(updatedRoom);
};

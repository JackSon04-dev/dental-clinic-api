// [DEV-ONLY / DEMO TEST TOOL] - Sẽ bị xóa khi dọn dẹp TopDemoBar
import devDatabaseService from '../../services/dev/devDatabaseService.js';
import { asyncHandler } from '../../common/errorMiddleware.js';

export const resetClean = asyncHandler(async (req, res) => {
  const result = await devDatabaseService.resetClean();
  res.json({
    success: true,
    ...result,
  });
});

export const seedMock = asyncHandler(async (req, res) => {
  const result = await devDatabaseService.seedMock();
  res.json({
    success: true,
    ...result,
  });
});

export default { resetClean, seedMock };

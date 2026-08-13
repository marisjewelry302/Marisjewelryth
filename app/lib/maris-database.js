// Supabase contract boundary for the whole app.
//
// The implementation lives in ./maris-database/, split by domain. This file
// stays put as the single import path, so callers are unaffected and the
// public surface stays reviewable in one place.

export {
  MARIS_DATABASE_TABLES,
  createSupabaseAdminClient,
  getSupabaseAdminConfig,
  readAdminDatabaseStatus
} from "./maris-database/connection.js";
export {
  createAdminProduct,
  deleteAdminProduct,
  readAdminBestSellerSettings,
  readAdminCatalogueProducts,
  readPublicBestSellerProducts,
  readPublicCatalogueProducts,
  readPublicProductBySlug,
  readRelatedPublicProducts,
  updateAdminBestSellerSettings,
  updateAdminProduct
} from "./maris-database/catalogue.js";
export {
  createAdminInventoryLog,
  createAdminOrder,
  createAdminPayment,
  readAdminInventoryLogs,
  readAdminOrders,
  readAdminPayments,
  updateAdminOrder
} from "./maris-database/commerce.js";
export {
  readAdminCustomers
} from "./maris-database/customers.js";
export {
  ADMIN_CUSTOM_ORDER_STATUSES,
  AdminCustomOrderRequestError,
  normalizeCustomOrderRequest,
  readAdminCustomOrderRequests,
  updateAdminCustomOrderRequest
} from "./maris-database/custom-orders.js";
export {
  AdminProductImageUploadError,
  deleteAdminProductImage,
  reorderAdminProductImages,
  uploadAdminProductImage
} from "./maris-database/product-images.js";

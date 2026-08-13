// Orders, payments, and the inventory ledger.

import { createSupabaseAdminClient, getSupabaseAdminConfig } from "./connection.js";

const ADMIN_ORDER_SELECT = `
  id,
  order_number,
  customer_id,
  status,
  payment_status,
  channel,
  subtotal_amount,
  discount_amount,
  shipping_amount,
  total_amount,
  currency,
  placed_at,
  notes,
  metadata,
  created_at,
  updated_at,
  customers (
    id,
    full_name,
    email,
    phone
  ),
  order_items (
    id,
    product_id,
    variant_id,
    product_code,
    item_name,
    quantity,
    unit_price_amount,
    total_amount
  )
`;

function normalizeOrder(row) {
  if (!row) {
    return null;
  }

  const productItem = Array.isArray(row.order_items) ? row.order_items[0] : null;

  return {
    id: row.id,
    orderNumber: row.order_number || "",
    status: row.status || "draft",
    paymentStatus: row.payment_status || "unpaid",
    channel: row.channel || "admin",
    subtotalAmount: Number(row.subtotal_amount) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    shippingAmount: Number(row.shipping_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    currency: row.currency || "THB",
    placedAt: row.placed_at || null,
    notes: row.notes || "",
    customerName: row.customers?.full_name || "Guest",
    customerEmail: row.customers?.email || "",
    customerPhone: row.customers?.phone || "",
    productId: productItem?.product_id || null,
    productCode: productItem?.product_code || "",
    qty: Number(productItem?.quantity) || 0,
    items: Array.isArray(row.order_items) ? row.order_items : [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function normalizeInventoryLog(row) {
  if (!row) {
    return null;
  }

  const product = row.products || row.product || null;
  const metadata = row.metadata || {};
  const stockQuantity = product?.stock_quantity ?? metadata.stockQuantity ?? metadata.stock_quantity ?? null;
  const reservedQuantity = product?.reserved_quantity ?? metadata.reservedQuantity ?? metadata.reserved_quantity ?? null;

  return {
    id: row.id,
    productId: row.product_id || null,
    variantId: row.variant_id || null,
    productCode: product?.sku || row.product_code || "",
    sku: product?.sku || row.product_code || "",
    changeType: row.change_type || row.movement_type || "adjustment",
    type: row.change_type || row.movement_type || "adjustment",
    quantity: Number(row.quantity) || 0,
    qty: Number(row.quantity) || 0,
    note: row.note || "",
    metadata,
    stockQuantity: stockQuantity === null || stockQuantity === undefined ? null : Number(stockQuantity),
    reservedQuantity: reservedQuantity === null || reservedQuantity === undefined ? null : Number(reservedQuantity),
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null
  };
}

function normalizePayment(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id || null,
    customerId: row.customer_id || null,
    gateway: row.payment_gateway || "",
    transactionId: row.gateway_transaction_id || "",
    amount: Number(row.amount) || 0,
    currency: row.currency || "THB",
    status: row.status || "pending",
    capturedAt: row.captured_at || null,
    receivedAt: row.received_at || null,
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export async function readAdminOrders({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      orders: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase orders could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    orders: Array.isArray(data) ? data.map(normalizeOrder) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminInventoryLogs({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      logs: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("inventory_logs")
    .select("*, products ( id, sku, name, stock_quantity, reserved_quantity )")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase inventory logs could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    logs: Array.isArray(data) ? data.map(normalizeInventoryLog) : [],
    checkedAt: new Date().toISOString()
  };
}

export async function readAdminPayments({ env = process.env, client, limit = 100 } = {}) {
  const config = getSupabaseAdminConfig(env);

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      projectRef: config.projectRef,
      missingEnv: config.missingEnv,
      payments: [],
      checkedAt: new Date().toISOString()
    };
  }

  const supabase = client || createSupabaseAdminClient(env);
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Supabase payments could not be loaded.");
  }

  return {
    isConfigured: true,
    projectRef: config.projectRef,
    missingEnv: [],
    payments: Array.isArray(data) ? data.map(normalizePayment) : [],
    checkedAt: new Date().toISOString()
  };
}

function calculateInventoryQuantities(product, changeType, quantity) {
  const stockQuantity = Number(product.stock_quantity || 0);
  const reservedQuantity = Number(product.reserved_quantity || 0);
  const amount = Number(quantity) || 0;

  if (amount <= 0) {
    throw new Error("Inventory quantity must be greater than zero.");
  }

  if (changeType === "receive" || changeType === "return") {
    return {
      stockQuantity: stockQuantity + amount,
      reservedQuantity
    };
  }

  if (changeType === "reserve") {
    if (stockQuantity - reservedQuantity < amount) {
      throw new Error("Not enough available stock to reserve.");
    }

    return {
      stockQuantity,
      reservedQuantity: reservedQuantity + amount
    };
  }

  if (changeType === "release") {
    if (reservedQuantity < amount) {
      throw new Error("Reserved stock is lower than this quantity.");
    }

    return {
      stockQuantity,
      reservedQuantity: reservedQuantity - amount
    };
  }

  if (changeType === "sale") {
    if (stockQuantity < amount || reservedQuantity < amount) {
      throw new Error("Paid sale needs enough real and reserved stock.");
    }

    return {
      stockQuantity: stockQuantity - amount,
      reservedQuantity: reservedQuantity - amount
    };
  }

  if (changeType === "damage") {
    if (stockQuantity < amount) {
      throw new Error("Real stock is lower than this quantity.");
    }

    return {
      stockQuantity: stockQuantity - amount,
      reservedQuantity
    };
  }

  if (changeType === "adjustment") {
    const nextStockQuantity = stockQuantity + amount;

    if (nextStockQuantity < reservedQuantity) {
      throw new Error("Adjusted stock cannot be lower than reserved stock.");
    }

    return {
      stockQuantity: nextStockQuantity,
      reservedQuantity
    };
  }

  throw new Error("Unsupported inventory movement type.");
}

export async function createAdminInventoryLog(log, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const changeType = log.changeType || log.movementType || "adjustment";
  const quantity = Number(log.quantity) || 0;
  const productId = log.productId || null;

  if (!productId) {
    throw new Error("Product id is required for inventory movement.");
  }

  const { data, error } = await supabase.rpc("maris_apply_inventory_movement", {
    p_product_id: productId,
    p_movement_type: changeType,
    p_quantity: quantity,
    p_variant_id: log.variantId || null,
    p_note: log.note || "",
    p_reference_type: log.referenceType || null,
    p_reference_id: log.referenceId || null,
    p_metadata: log.metadata || {},
    p_created_by: log.createdBy || null
  });

  if (error) {
    throw new Error(error.message || "Inventory log could not be created.");
  }

  return normalizeInventoryLog(data);
}

export async function createAdminOrder(orderData, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const quantity = Number(orderData.qty) || 1;
  const { data: result, error: rpcError } = await supabase.rpc("maris_create_admin_order", {
    p_product_id: orderData.productId || null,
    p_quantity: quantity,
    p_customer_name: orderData.customerName || null,
    p_customer_email: orderData.customerEmail || null,
    p_customer_phone: orderData.customerPhone || null,
    p_channel: orderData.channel || "admin",
    p_unit_price_amount: orderData.unitPriceAmount ?? null,
    p_subtotal_amount: orderData.subtotalAmount ?? null,
    p_discount_amount: orderData.discountAmount ?? 0,
    p_shipping_amount: orderData.shippingAmount ?? 0,
    p_total_amount: orderData.totalAmount ?? null,
    p_currency: orderData.currency || "THB",
    p_placed_at: orderData.placedAt || null,
    p_notes: orderData.notes || "",
    p_metadata: orderData.metadata || {},
    p_created_by: orderData.createdBy || null
  });

  if (rpcError) {
    throw new Error(rpcError.message || "Order could not be created.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .eq("id", result?.orderId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Created order could not be loaded.");
  }

  return normalizeOrder(data);
}

export async function updateAdminOrder(orderId, updates, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);

  if (updates.status === "paid" || updates.paymentStatus === "paid") {
    throw new Error("Payment status must be updated by the payment gateway webhook only.");
  }
  const { data: result, error: rpcError } = await supabase.rpc("maris_update_admin_order", {
    p_order_id: orderId,
    p_status: updates.status ?? null,
    p_payment_status: updates.paymentStatus ?? null,
    p_notes: updates.notes ?? null,
    p_created_by: updates.createdBy || null
  });

  if (rpcError) {
    throw new Error(rpcError.message || "Order could not be updated.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .eq("id", result?.orderId)
    .single();

  if (error) {
    throw new Error(error.message || "Order could not be updated.");
  }

  return normalizeOrder(data);
}

export async function createAdminPayment(payment, { env = process.env, client } = {}) {
  const config = getSupabaseAdminConfig(env);
  if (!config.isConfigured) {
    throw new Error(`Supabase admin database is not configured. Set ${config.missingEnv.join(", ")}.`);
  }

  const supabase = client || createSupabaseAdminClient(env);
  const status = String(payment.status || "pending").toLowerCase();

  if (status === "paid") {
    throw new Error("Paid status must be updated by the payment gateway webhook only.");
  }

  const { data: result, error: rpcError } = await supabase.rpc("maris_create_admin_payment", {
    p_order_id: payment.orderId || null,
    p_customer_id: payment.customerId || null,
    p_gateway: payment.gateway || "manual",
    p_transaction_id: payment.transactionId || null,
    p_amount: Number(payment.amount) || 0,
    p_currency: payment.currency || "THB",
    p_status: status,
    p_captured_at: payment.capturedAt || null,
    p_metadata: payment.metadata || {}
  });

  if (rpcError) {
    throw new Error(rpcError.message || "Payment record could not be created.");
  }

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", result?.paymentId)
    .single();

  if (error) {
    throw new Error(error.message || "Payment record could not be created.");
  }

  return normalizePayment(data);
}

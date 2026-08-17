const { sendEmail, storeEmailTemplate, escapeHtml } = require('../utils/email');

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PAYMENT_LABELS = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
};

const formatMoney = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const customerEmail = (order) =>
  order?.shippingAddress?.email || order?.customerId?.email || null;

const itemsRows = (order) =>
  (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${Number(item.quantity) || 0}</td>
        <td>${formatMoney(item.subtotal)}</td>
      </tr>`
    )
    .join('');

const addressBlock = (order) => {
  const a = order.shippingAddress || {};
  return `
    <p class="muted" style="margin:0">
      ${escapeHtml(a.name)}<br/>
      ${escapeHtml(a.addressLine)}<br/>
      ${escapeHtml(a.city)} ${escapeHtml(a.postalCode)}<br/>
      ${escapeHtml(a.phone)} · ${escapeHtml(a.email)}
    </p>`;
};

/**
 * Fire-and-forget order emails. Never throws to callers.
 */
const safeSend = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    console.error(`[order-email:${label}]`, err?.message || err);
  }
};

const sendOrderPlacedEmail = async ({ order, store }) => {
  const to = customerEmail(order);
  if (!to) return { skipped: true, reason: 'no-email' };

  const storeName = store?.name || 'Store';
  const orderNumber = order.orderNumber || order._id;
  const paymentLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;

  const content = `
    <p>Hi <strong>${escapeHtml(order.shippingAddress?.name || 'there')}</strong>,</p>
    <p>Thank you for your order at <strong>${escapeHtml(storeName)}</strong>. We’ve received it and will keep you updated.</p>
    <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}<br/>
    <strong>Payment method:</strong> ${escapeHtml(paymentLabel)}<br/>
    <strong>Payment status:</strong> ${escapeHtml(order.paymentStatus || 'pending')}<br/>
    <strong>Order status:</strong> ${escapeHtml(STATUS_LABELS[order.orderStatus] || order.orderStatus)}</p>
    <table class="items">
      <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
      <tbody>${itemsRows(order)}</tbody>
    </table>
    <p><strong>Subtotal:</strong> ${formatMoney(order.subtotal)}<br/>
    ${order.discountAmount ? `<strong>Discount:</strong> -${formatMoney(order.discountAmount)}<br/>` : ''}
    <strong>Shipping:</strong> ${formatMoney(order.shippingFee)}<br/>
    <strong>Total:</strong> ${formatMoney(order.totalAmount)}</p>
    <div class="divider"></div>
    <p><strong>Shipping to</strong></p>
    ${addressBlock(order)}
    <p class="muted">JazzCash / EasyPaisa gateway checkout will be available later — your order is already placed and our team will follow up on payment if needed.</p>
  `;

  return safeSend('placed', () =>
    sendEmail({
      to,
      subject: `Order confirmed — ${orderNumber} · ${storeName}`,
      html: storeEmailTemplate({ storeName, content }),
      fromName: storeName,
      replyTo: store?.contactEmail || undefined,
    })
  );
};

const sendOrderStatusEmail = async ({ order, store, previousStatus }) => {
  const to = customerEmail(order);
  if (!to) return { skipped: true, reason: 'no-email' };

  const storeName = store?.name || 'Store';
  const orderNumber = order.orderNumber || order._id;
  const nextLabel = STATUS_LABELS[order.orderStatus] || order.orderStatus;
  const prevLabel = STATUS_LABELS[previousStatus] || previousStatus;

  const tracking =
    order.shipping?.trackingNumber || order.shipping?.trackingUrl
      ? `<p><strong>Tracking:</strong> ${escapeHtml(order.shipping.trackingNumber || '')}
         ${
           order.shipping.trackingUrl
             ? `<br/><a href="${escapeHtml(order.shipping.trackingUrl)}">Track shipment</a>`
             : ''
         }
         ${order.shipping.carrier ? `<br/>Carrier: ${escapeHtml(order.shipping.carrier)}` : ''}
         </p>`
      : '';

  const content = `
    <p>Hi <strong>${escapeHtml(order.shippingAddress?.name || 'there')}</strong>,</p>
    <p>Your order <strong>${escapeHtml(orderNumber)}</strong> at <strong>${escapeHtml(storeName)}</strong> has been updated.</p>
    <p><strong>Status:</strong> ${escapeHtml(prevLabel)} → <strong>${escapeHtml(nextLabel)}</strong></p>
    ${tracking}
    <p><strong>Total:</strong> ${formatMoney(order.totalAmount)}</p>
    <div class="divider"></div>
    <p class="muted">If you have questions, reply to this email or contact ${escapeHtml(storeName)}.</p>
  `;

  return safeSend('status', () =>
    sendEmail({
      to,
      subject: `Order ${orderNumber} is now ${nextLabel} · ${storeName}`,
      html: storeEmailTemplate({ storeName, content }),
      fromName: storeName,
      replyTo: store?.contactEmail || undefined,
    })
  );
};

module.exports = {
  sendOrderPlacedEmail,
  sendOrderStatusEmail,
  STATUS_LABELS,
  PAYMENT_LABELS,
};

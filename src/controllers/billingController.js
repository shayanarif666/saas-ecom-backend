const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const billingService = require('../services/billingService');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await billingService.getBillingSummary(req.storeId, req.query);
  return successResponse(res, {
    message: 'Billing summary fetched',
    data: summary,
  });
});

const listRefunds = asyncHandler(async (req, res) => {
  const { items, meta } = await billingService.listRefunds(
    req.storeId,
    req.query
  );
  return successResponse(res, {
    message: 'Refunds fetched',
    data: { refunds: items },
    meta,
  });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { items, meta } = await billingService.listTransactions(
    req.storeId,
    req.query
  );
  return successResponse(res, {
    message: 'Transactions fetched',
    data: { transactions: items },
    meta,
  });
});

const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await billingService.getTransaction(
    req.storeId,
    req.params.id
  );
  return successResponse(res, {
    message: 'Transaction fetched',
    data: transaction,
  });
});

module.exports = { getSummary, listRefunds, listTransactions, getTransaction };

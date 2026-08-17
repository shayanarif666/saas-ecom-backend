const Address = require('../models/Address');
const AppError = require('../utils/AppError');

const listAddresses = async (storeId, userId) => {
  return Address.find({ storeId, userId }).sort({ isDefault: -1, updatedAt: -1 });
};

const createAddress = async (storeId, userId, payload) => {
  if (payload.isDefault) {
    await Address.updateMany({ storeId, userId }, { $set: { isDefault: false } });
  }

  const count = await Address.countDocuments({ storeId, userId });
  return Address.create({
    storeId,
    userId,
    label: payload.label || 'Home',
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    addressLine: payload.addressLine,
    city: payload.city,
    postalCode: payload.postalCode,
    isDefault: payload.isDefault || count === 0,
  });
};

const updateAddress = async (storeId, userId, addressId, payload) => {
  const address = await Address.findOne({ _id: addressId, storeId, userId });
  if (!address) throw new AppError('Address not found', 404);

  if (payload.isDefault) {
    await Address.updateMany({ storeId, userId }, { $set: { isDefault: false } });
  }

  const fields = [
    'label',
    'name',
    'phone',
    'email',
    'addressLine',
    'city',
    'postalCode',
    'isDefault',
  ];
  for (const key of fields) {
    if (payload[key] !== undefined) address[key] = payload[key];
  }
  await address.save();
  return address;
};

const deleteAddress = async (storeId, userId, addressId) => {
  const address = await Address.findOneAndDelete({ _id: addressId, storeId, userId });
  if (!address) throw new AppError('Address not found', 404);

  if (address.isDefault) {
    const next = await Address.findOne({ storeId, userId }).sort({ updatedAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  return { deleted: true };
};

module.exports = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};

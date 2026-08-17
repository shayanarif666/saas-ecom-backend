const Joi = require('joi');

module.exports = {
  getByOrder: {
    params: Joi.object({
      // Mongo ObjectId or human-readable order number
      orderId: Joi.string().trim().min(1).max(80).required(),
    }),
  },
};

const Joi = require('joi');

const analyticsQuery = Joi.object({
  days: Joi.number().integer().valid(7, 30, 90).default(30),
});

module.exports = {
  analytics: { query: analyticsQuery },
};

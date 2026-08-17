const mongoose = require('mongoose');
const { mongoUri, nodeEnv } = require('./env');

const connectDB = async () => {
  const conn = await mongoose.connect(mongoUri);
  if (nodeEnv !== 'test') {
    console.log(`MongoDB connected: ${conn.connection.host}`);
  }
};

module.exports = connectDB;

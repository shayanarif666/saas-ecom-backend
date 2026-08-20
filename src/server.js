const app = require('./app');
const connectDB = require('./config/db');
const { port, nodeEnv } = require('./config/env');
const axios = require('axios');

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running in ${nodeEnv} mode on port ${port}`);
    });
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running in ${nodeEnv} mode on port ${port}`);
      // Auto ping to keep Render awake
      const axios = require('axios');
      setInterval(async () => {
          try {
              await axios.get('https://saas-ecom-backend-g9zg.onrender.com/api/ping');
              console.log(`[AutoPing] Successful at ${new Date().toISOString()}`);
          } catch (err) {
              console.error('[AutoPing] Failed:', err.message);
          }
      }, 10 * 60 * 1000); // 10 minutes
  });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

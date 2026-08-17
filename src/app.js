const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');
const morgan = require('morgan');

const { frontendUrl, dashboardUrl, nodeEnv } = require('./config/env');
const makeQueryWritable = require('./middlewares/makeQueryWritable');
const sanitizeRequest = require('./middlewares/sanitizeRequest');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { ensureUploadsDir } = require('./utils/localUploads');

const app = express();

// Express 5: snapshot query to a writable object before anything mutates it
app.use(makeQueryWritable);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [frontendUrl, dashboardUrl],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// In-place sanitize (never overwrite req.query via assignment)
app.use(sanitizeRequest);
app.use(hpp());

if (nodeEnv === 'development') {
  app.use(morgan('dev'));
}

ensureUploadsDir();
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy' });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

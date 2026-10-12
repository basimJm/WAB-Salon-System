const path = require('path');
const http = require('http');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.resolve(__dirname, '..', envFile) });
const app = require('./app');
const connectDB = require('./config/db');
const { configureCloudinary } = require('./config/cloudinary');
const { initRealtime } = require('./core/realtime');
const { initNotifications } = require('./core/notifications');

const PORT = process.env.PORT || 5000;

const start = async () => {
  configureCloudinary();
  await connectDB();
  initNotifications();

  const server = http.createServer(app);
  initRealtime(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

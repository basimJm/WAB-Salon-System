const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { locale } = require('./middleware/locale.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(locale);

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;

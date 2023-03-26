const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const dbConnection = require('./src/db-connection/db-connection');
const routes = require('./src/routes/routes');
const {
  customErrorHandler,
  invalidPathHandler,
  errorLogger,
} = require('./src/error-handling/error-handlers');

const app = express();

// Database connection
dbConnection.connect();

// Logging
app.use(morgan('common'));

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Allow all Cross Origin Requests
app.use(cors());

// Routes
app.use(routes);

// Error Handling
app.use(errorLogger);
app.use(customErrorHandler);
app.use(invalidPathHandler);

// Listen for requests
const port = process.env.PORT || 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.info(`Movie App is listening on port ${process.env.PORT}.`);
});

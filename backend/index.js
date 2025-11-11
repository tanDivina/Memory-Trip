// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./src/routes/api');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
// Increase payload size limit for base64 images
app.use(bodyParser.json({ limit: '10mb' }));

// Routes
app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
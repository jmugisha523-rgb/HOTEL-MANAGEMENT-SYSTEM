
const express = require('express');
require("dotenv").config();

const app = express();
const port = 7000;

// Import routes
const userRoutes = require('./routes/userroutes.js');
const roomRoutes = require('./routes/roomroutes.js');
const bookingRoutes = require('./routes/bookingroutes.js');

app.use(express.json());

// User routes
app.use('/users', userRoutes);

// Room routes
app.use('/rooms', roomRoutes);

// Booking routes
app.use('/bookings', bookingRoutes);

// Home page
app.get('/', (req, res) => {
    res.send('Welcome to my application');
});

// About page
app.get('/about', (req, res) => {
    res.send('About us page');
});

// Login page
app.get('/login', (req, res) => {
    res.send('Login page');
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

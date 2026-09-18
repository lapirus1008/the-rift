require('dotenv').config();

var express = require('express');
var cors = require('cors');

var authRoutes = require('./routes/auth');
var riftRoutes = require('./routes/rift');

var app = express();

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rift', riftRoutes);

app.get('/api/health', function(req, res) {
    res.json({
        success: true,
        message: 'THE RIFT server is running.'
    });
});

var PORT = process.env.PORT || 3000;

app.listen(PORT, function() {
    console.log('THE RIFT server running on port ' + PORT);
});
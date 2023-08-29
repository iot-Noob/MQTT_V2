const ConnectToMongo = require('./db');
const bodyParser = require('body-parser');
ConnectToMongo();

const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/message', require('./routes/message'));

// Catch-all route
app.use((req, res, next) => {
    res.status(404).json({
        error: "Invalid Route not found"
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

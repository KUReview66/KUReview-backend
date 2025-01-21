const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('KUReview Backend Server')
});

const scoreRouter = require('./routes/score');
const authRouter = require('./routes/auth');

app.use('/score', scoreRouter);
app.use('/auth', authRouter);

const port = 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

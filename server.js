const express = require("express");
const sql = require("mssql");
require("dotenv").config();  

const app = express();

let config = {
    "user": "sa", 
    "password": "@KUReview123", 
    "server": "127.0.0.1", 
    "database": "suggestDB", 
    "options": {
        "encrypt": false 
    }
}

sql.connect(config, err => {
    if (err) {
        console.log("Database Connection Failed !!!", err.message);
    }
    console.log("Connection Successful!");
});

app.get("/", async (req, res) => {
    res.send("KUReview Backend Server");
});

app.get("/suggest", async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM suggestContent');
        res.send(result.recordset);
        pool.close();
    } catch (err) {
        console.error('SQL error', err);
    }
})

app.get("/suggest/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(config);

        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM suggestContent WHERE id = @id');
        if (result.recordset.length === 0) {
            res.status(404).send({ message: "No record found with the given ID" });
        } else {
            res.send(result.recordset); 
        }
        pool.close();
    } catch (err) {
        console.error('SQL error', err);
    }
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

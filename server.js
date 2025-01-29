const express = require("express");
const sql = require("mssql");
const axios = require('axios');
const qs = require('qs');
require("dotenv").config();  

const app = express();
app.use(express.json());

let config = {
    "user": process.env.DB_USER, 
    "password": process.env.DB_PASSWORD, 
    "server": process.env.DB_SERVER, 
    "database": process.env.DB, 
    "options": {
        "encrypt": false 
    }
}

let tokenReq = {
    "grant_type": process.env.KU_GRANT_TYPE, 
    "username": process.env.KU_USERNAME, 
    "password": process.env.KU_PASSWORD
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

app.get("/token", async (req, res) => {
    axios
    .post(process.env.KU_API_TOKEN, qs.stringify(tokenReq), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
    .then((response) => {
        console.log('Response:', response.data);
        res.send(response.data)
    })
    .catch((error) => {
        console.error('Error:', error.response ? error.response.data : error.message);
    });
})

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

app.post("/suggest", async (req, res) => {
    try {
        const {id, round, content} = req.body;
    
        const pool = await sql.connect(config);
    
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('round', sql.Int, round)
            .input('content', sql.Text, content)
            .query(
                'INSERT INTO suggestContent (id, round, content) VALUES (@id, @round, @content)'
            );
        
        res.status(201).send({
            message: 'Item created successfully', 
            id: id, 
        })
    } catch(err) {
        res.status(500).send({
            message: 'Internal server error', 
            error: err.message
        })
    }
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

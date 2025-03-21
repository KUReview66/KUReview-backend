const express = require("express");
const cors = require("cors");
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();  

const app = express();
app.use(express.json());

app.use(cors({ origin: "*" }));

const uri = process.env.URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let tokenReq = {
    "grant_type": process.env.KU_GRANT_TYPE, 
    "username": process.env.KU_USERNAME, 
    "password": process.env.KU_PASSWORD
}

const encodeString = (data) => {
    const kuPublicKey = process.env.KU_PUBLIC_KEY.replace(/\\n/gm, "\n");

    return crypto
        .publicEncrypt(
            {
            key: kuPublicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(data, "utf8")
        )
        .toString("base64");
};

function apiKeyGenerate () {
    const apiKey = crypto.randomBytes(32).toString("hex");
    process.env.KUR_APIKEY = apiKey;
    return apiKey;
}

async function connectMongo() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
    }
    return client.db("kureviewDB");
}

app.get("/", async (req, res) => {
    res.send("KUReview Backend Server");
});

app.post("/login", async (req, res) => {
    const appKey = process.env.KU_APP_KEY;

    const encodedBody = {
        username: encodeString(req.body.username),
        password: encodeString(req.body.password),
    };

    const username = req.body.username;

    try {
        const kuRes = await axios.post(process.env.KU_LOGIN, encodedBody, {
            headers: {
                "app-key": appKey,
            },
        });

        const data = kuRes.data;
        res.send(data)
        const db = await connectMongo();
        const studentInfoCollection = db.collection('studentInfo');

        const existingStudent = await studentInfoCollection.findOne({ username });
        if (existingStudent) {
        console.log("User already exists in DB.");
        } else {
        const insertResult = await studentInfoCollection.insertOne({
            username,
            data,   
            createdAt: new Date()
        });
        console.log('Inserted student info:', insertResult.insertedId);
        }

    } catch (error) {
        console.error('Login error:', error.response ? error.response.data : error.message);
        res.status(500).json({
            message: 'Login failed',
            error: error.response ? error.response.data : error.message,
        });
    }
})

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

app.get("/studentInfo/:id", async(req, res) => {
    const { id } = req.params; 
    const db = await connectMongo();
    const collection = db.collection('studentInfo');

    try {
        const studentInfo = await collection.find({
            "username": id
        }).toArray();

        if (studentInfo.length === 0) {
            res.send({ message: "No records found with that username." });
        } else {
            res.send(studentInfo); 
        }
    } catch (err) {
        console.error(err);
    }
})

app.post("/kureview/token", async (req, res) => {
    const {username, password, grant} = req.body;
    if (username === process.env.KUR_USERNAME && password === process.env.KUR_PASSWORD) {
        if (grant === 'admin') {
            const apiKey = apiKeyGenerate();
            res.send({
                apiKey: apiKey
            })
        }
    }
})

app.get("/student-score/topic-wise", async (req, res) => {
    const db = await connectMongo();
    const collection = db.collection('studentScore')
    try {
        const allScore = await collection.find({}).toArray();
        res.send(allScore);
    } catch (err) {
        console.error(err);
    }
})

app.get("/student-score/topic-wise/:id", async (req, res) => {
    const { id } = req.params; 
    const db = await connectMongo();
    const collection = db.collection('studentScore');
    
    try {
        const studentScores = await collection.find({
            "LoginName": id
        }).toArray();

        if (studentScores.length === 0) {
            res.send({ message: "No records found with that LoginName." });
        } else {
            res.send(studentScores); 
        }
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send({ message: "Server error." });
    }
});

app.get("/suggest", async (req, res) => {
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const allSuggest = await collection.find({}).toArray();
        res.send(allSuggest);
    } catch (err) {
        console.error(err);
    }
})

app.get("/suggest/:id", async (req, res) => {
    const { id } = req.params;
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const query = {
            "studentId": id,
        };
        console.log('Query:', query); 

        const studentSuggestion = await collection.find(query).toArray();

        if (studentSuggestion.length === 0) {
            res.send({ message: "No records found" });
        } else {
            res.send(studentSuggestion);
        }
    } catch (err) {
        console.log("Error occurred: ", err);  
        res.status(500).send({ message: "Internal server error" });
    }
})

app.get("/suggest/:id/:round/:unit", async (req, res) => {
    const { id, round, unit } = req.params;
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const query = {
            "studentId": id,
            "round": parseInt(round, 10),
            "unit": parseInt(unit, 10)
        };
        console.log('Query:', query); 

        const studentSuggestion = await collection.find(query).toArray();

        if (studentSuggestion.length === 0) {
            res.send({ message: "No records found" });
        } else {
            res.send(studentSuggestion);
        }
    } catch (err) {
        console.log("Error occurred: ", err);  
        res.status(500).send({ message: "Internal server error" });
    }
});



app.post("/suggest", async (req, res) => {
    const { studentId, round, unit, content, quiz } = req.body;
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const existingSuggestion = await collection.findOne({studentId, round, unit});
        if (existingSuggestion) {
            console.log(`Suggestion for this ${round} and ${unit} for this ${studentId} already exist`);
        } else {
            const insertSuggestion = await collection.insertOne({
                studentId, 
                round,
                unit, 
                content,
                quiz, 
                createdAt: new Date()
            });
            console.log(`insert suggestion: ${insertSuggestion}`)
        }
    } catch (err) {
        console.log(err);
    }
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

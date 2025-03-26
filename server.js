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

const unitSubtopics = {
    "02-Basic": [
        "Python Statement",
        "Arithmetic Expression",
        "Variable",
        "Data Types",
        "Data Type Conversion",
        "Input Statement",
        "String Formatting",
        "Output Statement and Formatting",
    ],
    "03-Subroutine": [
        "Subroutine Concept",
        "Built-in Functions",
        "Math Module",
        "User-defined Function",
        "Parameter Passing",
        "Function with Default Parameters",
        "Value-Returning Function",
        "Function with Returning Multiple Values",
        "Composition",
        "Getting Help in Python",
        "Local and Global Variables",
        "Positional and Named Arguments",
    ],
    "05-Selection": [
        "Boolean Operators and Expression",
        "Flowchart",
        "If Statement",
        "If-Else Statement",
        "Multiple Selection Concept",
        "Nested Conditions",
        "Chained Conditions",
    ],
    "06-Repetition": [
        "For Statement",
        "The range() Function",
        "While Statement",
        "Loop and a Half",
        "Infinite Loop",
        "Counting Loop",
        "Sentinel Loop",
        "Nested Loop",
    ],
    "07-List": [
        "Introduction to Collection",
        "List Methods",
        "Operations on List",
        "Properties of List vs. String",
        "List Slicing",
    ],
    "08-File": [
        "Reading a Text File",
        "Function vs. Method",
        "List Comprehension",
        "Nested List",
    ],
    "09-Numpy": [
        "Numpy with 1D-Array",
        "Array vs. List",
        "Reading a Text File using Numpy",
        "Numpy with 2D-Array",
    ],
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
            "round": round,
            "unit": unit
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
    const { studentId, round, unit, subtopic, content, quiz } = req.body;
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const existingSuggestion = await collection.findOne({studentId, round, unit, subtopic});
        if (existingSuggestion) {
            console.log(`Suggestion for this round ${round} and unit ${unit} for this ${studentId} already exist`);
        } else {
            const insertSuggestion = await collection.insertOne({
                studentId, 
                round,
                unit, 
                subtopic,
                content,
                quiz, 
                status: 'incomplete',
                createdAt: new Date()
            });
            console.log(`insert suggestion: ${insertSuggestion}`)
        }
    } catch (err) {
        console.log(err);
    }
})

app.put("/suggest/:id/:round/:unit/:subtopic", async (req, res) => {
    const { id, round, unit, subtopic } = req.params;

    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const query = {
            "studentId": id, 
            "round": round, 
            "unit": unit, 
            "subtopic": subtopic, 
        };

        const update = {
            $set: {
                [`status`]: 'complete'
            }
        };

        const result = await collection.updateOne(query, update);

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Student not found." });
        }

        res.json({ message: "Progress updated successfully." });
    } catch (err) {
        console.error(err);
    }
})

app.delete('/suggest-delete', async (req, res) => {
    const db = await connectMongo();
    const collection = db.collection('suggestion');

    try {
        const deleteSuggest = await collection.deleteMany({});
        console.log('delete all complete');
        return;
    } catch (err) {
        console.error(err);
    }
})  

app.delete('/suggest-delete/:id/:round', async (req, res) => {
    const { id, round } = req.params;

    const db = await connectMongo();
    const collection = db.collection('suggestion');
    try {
        const query = {
            "studentId": id, 
            "round": round, 
        }
        const deleteResult = await collection.deleteMany(query);
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: "No matching records found to delete." });
        }

        console.log(`Deleted ${deleteResult.deletedCount} records for ${id}, round: ${round}`);
        res.json({ message: `Deleted ${deleteResult.deletedCount} records successfully.` });
        
    } catch (err) {
        console.error(err)
    }
})

app.delete('/suggest-delete/:id/:round/:unit', async (req, res) => {
    const { id, round, unit } = req.params;

    const db = await connectMongo();
    const collection = db.collection('suggestion');
    try {
        const query = {
            "studentId": id, 
            "round": round, 
            "unit": unit, 
        }
        const deleteResult = await collection.deleteMany(query);
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: "No matching records found to delete." });
        }

        console.log(`Deleted ${deleteResult.deletedCount} records for ${id}, round: ${round}, unit: ${unit}`);
        res.json({ message: `Deleted ${deleteResult.deletedCount} records successfully.` });
        
    } catch (err) {
        console.error(err)
    }
})

app.delete('/suggest-delete/:id/:round/:unit/:subtopic', async (req, res) => {
    const { id, round, unit, subtopic } = req.params;

    const db = await connectMongo();
    const collection = db.collection('suggestion');
    try {
        const query = {
            "studentId": id, 
            "round": round, 
            "unit": unit, 
            "subtopic": subtopic
        }
        const deleteSuggest = await collection.deleteMany(query);
        console.log(`delete suggest for ${id}, round: ${round} unit: ${unit} subtopic: ${subtopic}`);
        return;
    } catch (err) {
        console.error(err)
    }
})

app.get("/score/statistic/:year", async (req, res) => {
    const { year } = req.params;

    if (!year) {
        return res.status(400).json({
            success: false,
        });
    }
    
    try {
        const db = await connectMongo();
        const collection = db.collection('studentScore');

        const allData = await collection.find({}).toArray();

        const stats = {};
        const targetPrefix = `b${year}`;

        const filteredData = allData.filter(entry => 
            entry.LoginName && entry.LoginName.startsWith(targetPrefix)
        );

        if (filteredData.length === 0) {
            return res.json({
                success: true,
                message: `No students found for class year ${year}`
            });
        }

        const roundStats = {}; 

        filteredData.forEach(entry => {
            const round = entry.scheduleName;
            const sections = entry.SectionData;

            if (!roundStats[round]) {
                roundStats[round] = {
                    scores: [],
                    totalScoreStatistics: {},
                    topicStatistics: {}
                };
            }

            const sectionScores = Object.values(sections || {}).map(section => section.score || 0);
            const totalScore = sectionScores.reduce((acc, val) => acc + val, 0);
            roundStats[round].scores.push(totalScore);

            Object.keys(sections).forEach(sectionKey => {
                const section = sections[sectionKey];
                const topics = section.scoreDetail;

                Object.keys(topics).forEach(topicKey => {
                    const topic = topics[topicKey];
                    const topicName = topic.topicName;
                    const topicScore = topic.topicScore;

                    if (!roundStats[round].topicStatistics[topicName]) {
                        roundStats[round].topicStatistics[topicName] = {
                            scores: [],
                            average: 0,
                            max: Number.MIN_SAFE_INTEGER,
                            min: Number.MAX_SAFE_INTEGER
                        };
                    }

                    const topicStats = roundStats[round].topicStatistics[topicName];
                    topicStats.scores.push(topicScore);
                    topicStats.max = Math.max(topicStats.max, topicScore);
                    topicStats.min = Math.min(topicStats.min, topicScore);
                });
            });
        });

        Object.keys(roundStats).forEach(round => {
            const scores = roundStats[round].scores;
            const sum = scores.reduce((acc, val) => acc + val, 0);
            const avg = sum / scores.length;
            const min = Math.min(...scores);
            const max = Math.max(...scores);
            const variance = scores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / scores.length;
            const sd = Math.sqrt(variance);

            roundStats[round].totalScoreStatistics = {
                average: avg,
                min,
                max,
                standardDeviation: sd
            };

            delete roundStats[round].scores;

            Object.keys(roundStats[round].topicStatistics).forEach(topicName => {
                const topicStats = roundStats[round].topicStatistics[topicName];
                const topicSum = topicStats.scores.reduce((acc, val) => acc + val, 0);
                topicStats.average = topicStats.scores.length > 0 ? topicSum / topicStats.scores.length : 0;

                delete topicStats.scores;
            });
        });

        res.json({
            success: true,
            classYear: year,
            data: roundStats
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



app.get("/progress/:id", async (req, res) => {
    const {id} = req.params;

    const db = await connectMongo();
    const collection = db.collection('studentStudyProgress');

    try {
        const query = {
            "studentId": id,
        };
        console.log('Query:', query); 

        const studentStudyProgress = await collection.find(query).toArray();

        if (studentStudyProgress.length === 0) {
            res.send({ message: "No records found" });
        } else {
            res.send(studentStudyProgress);
        }
    } catch (err) {
        console.err(err)
    }
})

app.post("/progress", async (req, res) => {
    const { studentId } = req.body;

    const db = await connectMongo();
    const collection = db.collection('studentStudyProgress');

    try {
        const insertedProgress = await collection.insertOne({
            studentId, 
            progress: {
                "basic": {
                    "topicName": "02-Basic", 
                    "progress": 0
                }, 
                "subroutine": {
                    "topicName": "03-Subroutine", 
                    "progress": 0
                }, 
                "selection": {
                    "topicName": "05-Selection", 
                    "progress": 0
                }, 
                "repetition": {
                    "topicName": "06-Repetition", 
                    "progress": 0
                }, 
                "list": {
                    "topicName": "07-List", 
                    "progress": 0
                }, 
                "file": {
                    "topicName": "08-File", 
                    "progress": 0
                }, 
                "numpy": {
                    "topicName": "09-Numpy", 
                    "progress": 0
                }
            }, 
            createdAt: new Date() 
        });

        const insertedDocument = await collection.findOne({ _id: insertedProgress.insertedId });

        console.log(`insert progress: ${insertedProgress}`)
        res.send(JSON.stringify(insertedDocument, null, 2));
    } catch (err) {
        console.error(err)
    }
})

app.put("/progress/:id", async (req, res) => {
    const { id } = req.params;

    const db = await connectMongo();
    const progressCollection = db.collection('studentStudyProgress');
    const suggestionCollection = db.collection('suggestion');

    try {
        const studentProgress = await progressCollection.findOne({ "studentId": id });

        if (!studentProgress) {
            return res.status(404).json({ error: "Student not found." });
        }

        const studentContent = await suggestionCollection.find({ "studentId": id }).toArray();

        if (studentContent.length === 0) {
            return res.status(404).json({ error: "No content found for this student." });
        }

        const rounds = ["comproExamR1", "comproExamR2", "comproExamR3"];
        const latestRound = rounds.reduce((latest, round) => {
            const roundData = studentContent.filter(entry => entry.round === round && entry.status === "complete");
            return roundData.length > 0 && (!latest || round > latest) ? round : latest;
        }, null);

        if (!latestRound) {
            return res.status(404).json({ error: "No completed rounds found for this student." });
        }

        const completedSubtopics = studentContent
            .filter(entry => entry.round === latestRound && entry.status === "complete")
            .map(entry => entry.subtopic);

        const topicCompletion = {};

        Object.keys(unitSubtopics).forEach(topic => {
            const subtopics = unitSubtopics[topic];
            const completedCount = completedSubtopics.filter(sub => subtopics.includes(sub)).length;
            const totalSubtopics = subtopics.length;

            const progressPercentage = Math.round((completedCount / totalSubtopics) * 100) || 0;
            topicCompletion[topic] = {
                topicName: topic,
                progress: progressPercentage
            };
        });

        const updateObject = {
            progress: {}
        };

        Object.keys(topicCompletion).forEach(topic => {
            updateObject.progress[topic] = topicCompletion[topic];
        });

        const result = await progressCollection.updateOne(
            { studentId: id },
            { $set: updateObject }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Student progress not found." });
        }

        res.json({ message: "Progress updated successfully.", updatedProgress: topicCompletion });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.get('/exercise/score/:id', async (req, res) => {
    const { id } = req.params;

    const db = await connectMongo();
    const collection = db.collection('exerciseScore');

    try {
        const query = {
            "studentId": id
        }

        const result = await collection.find(query).toArray();

        if (result.length === 0) {
            res.send({ message: "No records found" });
        } else {
            res.send(result);
        }
    } catch (err) {
        console.error(err);
    }
})

app.post('/exercise/score', async(req, res) => {

    const { studentId, scoreData} = req.body;

    const db = await connectMongo();
    const collection = db.collection('exerciseScore');

    try {
        const insertedScore = await collection.insertOne({
            studentId, 
            scoreData
        });

        console.log('insert score', insertedScore);
        res.send('POST Success');
    } catch(err) {
        console.error(err);
    }
})

app.put('/exercise/score/:id', async (req, res) => {
    const { id } = req.params;
    const { newScoreData } = req.body;

    const db = await connectMongo();
    const collection = db.collection('exerciseScore');

    try {
        const query = {
            "studentId": id
        }

        const update = { $push: { scoreData: newScoreData } };

        const result = await collection.updateOne(query, update);
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Student not found." });
        }

        res.json({ message: "Score added successfully."});
    } catch (err) {
        console.error(err);
    }
})

app.get("/exercise/current/:id/:unit", async (req, res) => {
    const { id, unit } = req.params;

    const db = await connectMongo();
    const collection = db.collection('currentExercise');

    try {
        const query = {
            "studentId": id, 
            "unit": unit
        }

        const currentExercise = await collection.find(query).toArray();

        if (currentExercise.length === 0) {
            res.send({ message: "No records found" });
        } else {
            res.send(currentExercise);
        }
    } catch(err) {
        console.error(err);
    }
})

app.post("/exercise/current", async (req, res) => {
    const { studentId, unit, score, answerNKey, analytic } = req.body;

    const db = await connectMongo();
    const collection = db.collection('currentExercise');

    try {
        const insertCurrentExercise = await collection.insertOne({
            studentId, 
            unit, 
            score, 
            answerNKey, 
            analytic
        });

        console.log('insert', insertCurrentExercise);
        res.send('POST Succesfully');
    } catch (err) {
        console.error(err);
    }
})

app.put("/exercise/current/:id/:unit", async (req, res) => {
    const { id, unit } = req.params;
    const { score, answerNKey, analytic } = req.body;

    const db = await connectMongo();
    const collection = db.collection('currentExercise'); 

    try {
        const query = {
            "studentId": id, 
            "unit": unit
        };

        const update = {
            $set: {
                score, 
                answerNKey, 
                analytic
            }
        };

        const result = await collection.updateOne(query, update);

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "No matching record found." });
        } 

        res.json({ message: "Exercise updated successfully.", modifiedCount: result.modifiedCount });
        
    } catch (err) {
        console.error(err);
    }
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const mysql = require("mysql");
  
let db_con = mysql.createConnection({
  host: "localhost",
  user: "kureview",
  password: "",
});

db_con.connect((err) => {
  if (err) {
    console.log("Database Connection Failed !!!", err.message);
  } else {
    console.log("Connected to Database");
  }
});
  
module.exports = db_con;
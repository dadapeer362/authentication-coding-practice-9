const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

module.exports = app;

const dbPath = path.join(__dirname, "userData.db");

let db = null;

//initializeDBAndServer
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};

initializeDBAndServer();

// Post user details

app.post("/register", async (request, response) => {
  const userDetails = request.body;
  const { username, name, password, gender, location } = userDetails;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = ` 
        SELECT 
            * 
        FROM 
            user 
        WHERE 
            username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `
            INSERT INTO 
                user (username, name, password, gender, location)
            VALUES 
                ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const selectUserQuery = `
        SELECT 
            *
        FROM 
            user 
        WHERE 
            username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched == true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const userDetails = request.body;
  const { username, oldPassword, newPassword } = userDetails;
  const selectUserQuery = ` 
        SELECT 
            * 
        FROM 
            user 
        WHERE 
            username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser != undefined) {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateUserDetails = `
                UPDATE 
                    user 
                SET
                    password = '${hashedPassword}'
                WHERE 
                    username = '${username}';`;
        await db.run(updateUserDetails);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

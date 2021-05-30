const cors = require("cors");
const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const { start } = require("repl");
const PORT = process.env.PORT || 3001;

const app = express();
const upload = multer();

// parsing json
app.use(express.json());
// parsing url-encoded
app.use(express.urlencoded({ extended: true }));

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.static(path.resolve(__dirname, '../client/build')));

mongoose.connect(process.env.MONGO_URI_TEST, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function () {
    console.log("Connection Successful!");
})

const exerciseSchema = new mongoose.Schema({
    description: { type: String },
    duration: { type: String },
    date: { type: Date }
});

const userSchema = new mongoose.Schema({
    username: { type: String },
    exercises: [Object]
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
const User = mongoose.model('User', userSchema);

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

app.get('/', (req, res) => {
    res.json({ message: "Hello World!" });
});

//create a new user
app.post('/api/users', (req, res) => {
    const username = req.body.username;
    User.findOne({ username: username }, function (err, user) {
        if (err) {
            return console.error(err);
        } else if (user) {
            //if the user already exists, return it
            console.log("user exists");
            return res.json({ username: username, _id: user._id });
        } else {
            //the username is not taken > create a new user
            console.log("creating new user");
            const newUser = new User({ username: username });
            newUser.save(function (err, user) {
                if (err) {
                    return console.error(err);
                } else {
                    return res.json({ username: user.username, _id: user._id });
                }
            })
        }
    })
});

//get all users
app.get('/api/users', (req, res) => {
    User.find({}, { username: 1 }, { _id: 1 }, function (err, users) {
        if (err) {
            return console.error(err);
        } else {
            return res.json(users)
        }
    })
});

//post request to /api/users/:_id/exercises
//form data: description, duration, optional data
//no date provided => use current date
//return user with exercises
app.post('/api/users/:_id/exercises', upload.none(), (req, res) => {
    const userId = req.params._id;

    const description = req.body.description;
    const duration = parseInt(req.body.duration);
    let date = req.body.date;

    if (date === undefined) {
        console.log("no date was provided.");
        date = new Date();
        date = date.toString();
        date = date.slice(0, 15);
        console.log("today's date: " +date);
    } else {
        console.log(date);
        date = new Date(date+"T00:00:00");
        date = date.toString();
        date = date.slice(0, 15);
        console.log("the provided date: " +date);
    }
    const newExercise = { description: description, duration: duration, date: date };
    User.findById({ _id: userId }, function (err, user) {
        if (err) {
            return console.error(err);
        } else if (user) {
            user.exercises.push(newExercise);
            user.save(function (err, data) {
                if (err) {
                    return console.error(err);
                } else {
                    return res.json({ _id: user._id, username: user.username, date: date, duration: duration, description: description });
                }
            });
        } else {
            return res.json({ error: "User was not found." });
        }
    });
});

//get request to /api/users/:id/logs
//retrieve full exercise log of any user
//returned response will be the user object, a count object of number of exercises, and a log array of each exercise(description, duration, date)
//you can add from, to, limit parameters to retrieve part of the log
app.get('/api/users/:id/logs', (req, res) => {
    const userId = req.params.id;
    const from = req.query.from;
    const to = req.query.to;
    const limit = parseInt(req.query.limit);

    let startDate = new Date(from+"T00:00:00");
    let endDate = new Date(to+"T00:00:00");

    User.findById({_id: userId}, {exercises: {$slice: limit}}, function(err, user) {
        if(err){
            return console.error(err)
        } else if (user) {            
            if(from && to){
                let result = user.exercises.filter((item) => {
                    dateFormat = new Date(item.date);
                    return dateFormat >= startDate && dateFormat <= endDate;
                });
                return res.json({_id: user._id, username: user.username, count: result.length, log: result});
            } else {
                const count = user.exercises.length;
                return res.json({_id: user._id, username: user.username, count: count, log: user.exercises});
            }
        } else {
            return res.json({ error: "User was not found."});
        }
    });
});


app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
});
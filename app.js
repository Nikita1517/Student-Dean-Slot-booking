require("dotenv").config();
require("./config/database").connect();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
// importing user context
const User = require("./model/user");

const DeanSession = require("./model/deanSession");
// Logic goes here

// Register
app.post("/register", async (req, res) => {
  // our register logic goes here...

  try {
    // Get user input
    const { first_name, last_name, email, password } = req.body;

    // Validate user input
    if (!(email && password && first_name && last_name)) {
      res.status(400).send("All input is required");
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    // return new user
    res.status(201).json(user);
  } catch (err) {
    console.log(err);
  }
  // Our register logic ends here
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      // user
      res.status(200).json(user);
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    console.log(err);
  }
  // Our register logic ends here
});

// Login
app.post("/login", async (req, res) => {
  // our login logic goes here
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      // save user token
      user.token = token;

      const slots = await DeanSession.find();
      slots.forEach(async (slotPiece) => {
        const { _id, slot, day } = slotPiece;
        const updateSlot = new DeanSession({
          _id,
          slot,
          day,
          status: "available",
          booked_by: "Null",
        });
        const option = { new: false };

        if (!slot.end_time || slot.end_time > Date.now) {
          await DeanSession.findOneAndUpdate(_id, updateSlot, option);
        }
      });

      // user
      res.status(200).json(user);
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (err) {
    console.log(err);
  }
  // Our login logic ends here
});

const auth = require("./middleware/auth");
const Session = require("./model/deanSession");

app.get("/availableSessions", auth, async (req, res) => {
  const availableSessions = await DeanSession.find({ status: "available" });
  if (availableSessions) {
    res.status(200).send(availableSessions);
  } else {
    res.status(404).send("No Session Available with the Dean");
  }
});

app.get("/sessions", auth, async (req, res) => {
  const user = req.user.email;
  const dean = user.substring(user.indexOf("@") + 1, user.indexOf("."));
  if (dean == "dean") {
    const deanSession = await DeanSession.find({});
    res.status(200).send(deanSession);
  } else {
    const allSessions = await DeanSession.find({});
    res.status(200).send(allSessions);
  }
});

app.post("/book/:slot", auth, async (req, res) => {
  const user = req.user.email;
  const dean = user.substring(user.indexOf("@") + 1, user.indexOf("."));
  if (dean == "dean") {
    res.status(200).send("Dean can't book a slot");
  } else {
    const slot = req.params.slot;

    const session = await DeanSession.findOne({
      slot: slot,
      status: "available",
    });
    if (session) {
      const { _id, slot, day } = session;
      const end_time = new Date().setHours(new Date().getHours() + 1);
      console.log(end_time.toString());
      const updateSlot = new DeanSession({
        _id,
        slot,
        day,
        status: "booked",
        booked_by: req.user.email,
        start_time: Date.now,
        end_time: end_time,
      });
      const option = { new: true };

      const bookedSession = await DeanSession.findOneAndUpdate(
        _id,
        updateSlot,
        option
      );

      res.status(200).send(bookedSession);
    } else {
      const availableSession = await DeanSession.findOne({
        status: "available",
      });
      if (availableSession) res.status(400).send(availableSession);
      else res.status(400).send("No Session Available with the Dean!");
    }
  }

  // const sessions = await DeanSession.find({slot: slot});
  // res.status(200).send(sessions);
});

module.exports = app;

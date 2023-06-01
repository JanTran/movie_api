const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const app = express();
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");

const Models = require("./models.js");
const Movies = Models.Movie;
const Users = Models.User;
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let auth = require("./auth")(app);

/**
 * importing Passport module and passport.js file
 */
const passport = require("passport");
require("./passport");

mongoose
  .connect(process.env.CONNECTION_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("mongodb connected");
  });

/**
 * Creating '/' endpoint, that returns welcome message
 * @method GET
 * @name welcomeMessage
 * @kind function
 * @returns Welcome message
 */
app.get("/", (req, res) => {
  res.send("Welcome to the myFlix movie app!");
});

/**
 * Creating endpoint for documentation page (static)
 * @method GET to endpoint '/public/documentation.html'
 * @name documentation
 * @kind function
 * @returns status of response, transfers the file at the given path /public/documentation.html'.
 */
app.get("/documentation", (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
});

/**
 * @method GET to endpoint '/movies'
 * @name getMovies
 * @kind function
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about all the movies
 */
app.get("/movies", (req, res) => {
  Movies.find()
    .then((movies) => {
      console.log(movies);
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});

/**
 * @method GET to endpoint '/movies/:title'
 * @name getMovie
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns Returns a JSON object holding data about a single movie by title
 */
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movie.findOne({ Title: req.params.title })
      .then((movie) => {
        res.status(200).json(movie);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @method GET to endpoint '/movies/genre/:genreName'
 * @name getGenre
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about ganre by name
 */
app.get(
  "/movies/genres/:Name",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Genre.Name": req.params.Name })
      .then((movies) => {
        res.send(movies.Genre);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * @method GET to endpoint '/movies/directors/:directorName'
 * @name getDirector
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about director by name
 */
app.get(
  "/movies/directors/:Name",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Director.Name": req.params.Name })
      .then((movies) => {
        res.send(movies.Director);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * This function allows new users to Register:
 * validates request JSON object (includes all required fields)
 * checks DB, if the user that is going to be created already exists
 * if no errors appeared, creates new user object in DB
 * @method POST to endpoint '/users'
 * @name addUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object holding data of newly created user
 */
app.post(
  "/users",
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          //If the user is found, send a response that it already exists
          return res.status(400).send(req.body.Username + " already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

// Update a user's info, by username
/* We’ll expect JSON in this format
{
  Username: String,
  (required)
  Password: String,
  (required)
  Email: String,
  (required)
  Birthday: Date
}*/
app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

/**
 * This function allows to add specific movie to the list of favorites for specific user
 * @method POST to endpoint '/users/:Username/movies/:MovieID'
 * @name addFavorite
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object with updated user information
 */
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.user.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }, //This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);
app.get(
  "/user",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findById(req.user._id)
      .populate("FavoriteMovies")
      .then((user) => {
        res.json({ user });
      })
      .catch((error) => {
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * This function allows to delete specific movie from the list of favorites for specific user
 * @method DELETE to endpoint '/users/:Username/movies/:MovieID'
 * @name deleteFavorite
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object with updated user information
 */
app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: { FavoriteMovies: req.params.MovieID },
      },
      { new: true },
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error: " + err);
        } else {
          res.json(updatedUser);
        }
      }
    );
  }
);

/**
 * This function allows the user to delete account from DB
 * @method DELETE to endpoint '/users/:Username'
 * @name deleteUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns message that :Username was deleted
 */
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + " was not found");
        } else {
          res.status(200).send(req.params.Username + " was deleted.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

/**
 * Setting variable for port that will be listening for requests
 */
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});

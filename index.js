const express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  path = require ('path'),
  uuid = require('uuid'),
  morgan = require('morgan');

const app = express();  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { check, validationResult } = require('express-validator');

const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'https://movieapi-9rx2.onrender.com/', 'http://localhost:1234'];
app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

accessLogStream = fs.createWriteStream(path.join(__dirname, './log.txt.log'), {flags: 'a'});

// keep and use for local connetion //
/* mongoose.connect('mongodb://127.0.0.1:27017/myflixDB', { useNewUrlParser: true, useUnifiedTopology: true }); */

mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.static('public'));
app.use(morgan('common', {
  stream: fs.createWriteStream('./log.txt.log', {flags: 'a'})
}));
app.use(morgan('dev'));

/* welcome page text response */
app.get('/', (req, res) => {
  res.send('Welcome to MyFlix Movie App!');
});

/* GET request for all movies at endpoint /movies */
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
    .then((movies) => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* GET a specific movie by title at endpoint /movies/:Title */
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.status(201).json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* GET movie data by genre name at endpoint /movies/genre/:Name */
app.get('/movies/genre/:Name', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'Genre.Name': req.params.Name })
    .then((movies) => {
      res.send(movies.Genre);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* GET movie data by director name at endpoint /movies/director/:directorName */
app.get('/movies/director/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.directorName })
    .then((movies) => {
      res.send(movies.Director);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* async code, POST route to add a new movie to database at endpoint /movies */
app.post('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
  const movie = await Movies.findOne({Title: req.body.Title})
  if (movie) {
    return res.status(400).send(req.body.Title + 'already exists');
  } else {
    const newMovie = await Movies.create({
      Title: req.body.Title,
      Description: req.body.Description,
      Genre: {
        Name: req.body.Genre.Name,
        Description: req.body.Genre.Description
      },
      Director: {
        Name: req.body.Director.Name,
        Bio: req.body.Director.Bio,
        Birthyear: req.body.Director.Birthyear,
        Deathyear: req.body.Director.Deathyear
      },
      ImagePath: req.body.ImagePath,
      Featured: req.body.Featured,
      Release: req.body.Release
    })
      res.status(201).json(newMovie)
  }
} catch (error) {
  console.error(error);
  res.status(500).send('Error' + error);
}
});

/* GET all users at endpoint /users */
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* GET a specific user by username at endpoint /users/:Username */
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/* POST: allows new users to register at endpoint /users */
app.post('/users',
  [
    check('Username', 'Username is required and minimum length is 5 characters').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail(),
    //check('Birthday', 'Birthday should be in the format DD/MM/YYYY').isDate({format:'DD/MM/YYYY'})//
  ], (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + 'already exists');
        } else {
          Users.create({
          /* req.body is data input by user, the keys (eg Email) correlate to a field in models.js */
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          /* name of newly created document is in parenthesis after .then */
            .then((user) => {
              res.status(201).json(user) 
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
          }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
    });

/* UPDATE user info by username at endpoint /users/:Username */
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), 
[
  check('Username', 'Username is required and minimum length is 5 characters').isLength({min: 5}),
  check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail(),
  //check('Birthday', 'Birthday should be in the format DD/MM/YYYY').isDate({format:'DD/MM/YYYY'})//
], (req, res) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: hashedPassword,
      Email: req.body.Email,
      Birthday: req.body.Birthday,
    },
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

/* async code, add a movie to favorites at endpoint /users/:id/favorites */
app.post('/users/:id/favorites', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await Users.findById(req.params.id);
    user.FavoriteMovies.push(req.body.movieId);
    await user.save();
    res.status(200).json( { message: "Movie added to favorites" } );
  }
    catch(err) {
    res.status(404).json( { message: err.message } );
  }
}); 

// async code, delete a movie from favorites at endpoint /users/:id/favorites //
app.delete('/users/:id/favorites', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await Users.findById(req.params.id);
    user.FavoriteMovies.pull(req.body.movieId);
    await user.save();
    res.status(200).json( { message: "Movie removed from favorites" } );
  }
  catch(err) {
    res.status(404).json( { message: err.message } );
  }
  });

/* DELETE a user at endpoint /users/:Username */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
  .then((user) => {
    if (!user) {
      res.status(400).send(req.params.Username + ' was not found');
    } else {
      res.status(200).send(req.params.Username + ' was deleted.');
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

/* error handler comes after all route calls and app.use but before app.listen */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('It\'s not working right now!');
  });

/* listen for requests, replaces http.createServer code */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

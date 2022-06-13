const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const { connect, connection, Schema } = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI
connect(mongoURI, { useNewUrlParser: true });
connection.on('connected', () => console.log("Connected to DB"));
connection.on('error', (err) => console.log("Can't connect to DB", err));

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  log: [{
    date: Date,
    duration: Number,
    description: String
  }],
  count: Number
});

const User = connection.model('User', userSchema);


app.route('/api/users')
  .post((req, res) => {
    const username = req.body.username;
    const user = new User({ username, count: 0 });
    user.save((err, user) => !err ? res.json(user) : res.json({ message: err }))
  })

  .get((req, res) => {
    User.find((err, user) => !err ? res.json(user) : res.json({ message: err }))
  })

app.post("/api/users/:_id/exercises", (req, res) => {

  const { description } = req.body;
  const duration = parseInt(req.body.duration);
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const id = req.params._id;

  const exercise = {
    description,
    duration,
    date,
  };

  User.findByIdAndUpdate(id, {
    $push: { log: exercise },
    $inc: { count: 1 }
  }, { new: true }, (err, user) => {
    if (user) {
      const updatedExercise = {
        _id: id,
        username: user.username,
        ...exercise,
      }
      updatedExercise.date = updatedExercise.date.toDateString();
      res.json(updatedExercise)
    }
  })
})



app.get("/api/users/:_id/logs", (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  User.findById(_id, (err, data) => {
    let resObj = data;

    if (from || to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (from) {
        fromDate = new Date(from);
      }

      if (to) {
        toDate = new Date(to);
      }

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      resObj.log = resObj.log.filter((item) => {
        let newDate = new Date(item.date).getTime();
        return newDate >= fromDate && newDate <= toDate;
      });
    }

    if (limit) {
      resObj.log = resObj.log.slice(0, limit);
    }

    resObj.count = data.log.length;

    let finalRes = {
      _id: resObj._id,
      username: resObj.username,
      count: resObj.count,
      log: resObj.log.map((item) => {
        let newDate = new Date(item.date).toDateString();
        return {
          description: item.description,
          duration: item.duration,
          date: newDate
        }
      })
    }

    console.log(finalRes)
    res.json(finalRes);
  })

});


app.get("/state", (req, res) => {
  res.json({ message: connection.readyState })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

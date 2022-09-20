require('dotenv').config();
let bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const URL = require('url').URL;
const app = express();

let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}

console.log(process.env.MONGO_URI);
console.log(process.env.PORT);

// Mongoose Set Up
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: {type: String, required: true},
  short_url: {type: Number, required: true}
})

let urlModel = mongoose.model("url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// Middleware function to parse post requests
app.use("/", bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Your first API endpoint
app.post('/api/shorturl', function(req, res) {

  let resObj = {};
  let url_obj;
  const url = req.body.url;

  console.log(url);

  // Try and parse the input URL as a valid URL
  if (url){
    try {
      url_obj = new URL(url);
    } catch (error){
      res.json({error: "invalid url"});
    } 
  }

  // If we have a valid URL proceed
  if (url_obj) {
    // Try to look up the url
    dns.lookup(url_obj.hostname, function(err, address){
      if (address) {
        // Check if the URL already exists in the database
        urlModel.find({original_url: url}, function (err, dataFound){
          // If not found in the database
          if (dataFound.length < 1){
            // Get the latest short url
            urlModel.find({}).sort({short_url: "desc"}).limit(1).
            then(

              function(latestData){
                console.log(latestData);
                let lastShortURL = 0;
                if (latestData.length > 0){
                  lastShortURL = parseInt(latestData[0].short_url);
                }
                // Create new URL in the database with a short url incremented by one more than the current max
                resObj = {original_url: url, short_url: lastShortURL + 1};
                let newURL = new urlModel(resObj);
                newURL.save();
                res.json(resObj);
              });
          } 
          // If found in the database we do not need to create it
          else {
            resObj = {original_url: dataFound[0].original_url, short_url: parseInt(dataFound[0].short_url)}
            res.json(resObj);
          }
          if (err) console.log("find", err);
        });
      }
      else{
        res.json({error: "invalid url"});
      }
      if (err) console.log("dns", err);
    });
  }
});

// Visitng a short url
app.get('/api/shorturl/:shorturl?', function(req, res) {
  console.log("get shorturl");
  var shorturl = req.params.shorturl;
  // If url exists re-direct
  urlModel.findOne({short_url: shorturl}).then(function(foundData){
    if (foundData){
      res.redirect(foundData.original_url);
    } else {
      res.json({error:"No short URL found for the given input"});
    }
    
  })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

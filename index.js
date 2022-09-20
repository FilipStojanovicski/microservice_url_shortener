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
  url: {type: String, required: true},
  shorturl: {type: Number, required: true}
})

let urlModel = mongoose.model("url", urlSchema);

// // Function to put URL in db
// const createAndSaveURL = (url) => {
//   let newURL = new urlModel({url: url, shorturl: 2});
//   console.log(newURL);
//   let savedURL = await newURL.save();
//   console.log(savedURL);
//   return savedURL;
// };

// const findURL = (urlToSearch) => {
//   let urlFound = await urlModel.find({url: urlToSearch});
//   console.log(urlFound);
//   console.log()
//   return urlFound;
// };

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
      res.json({error: "Invalid URL"});
    } 
  }

  // If we have a valid URL proceed
  if (url_obj) {
    // Try to look up the url
    dns.lookup(url_obj.hostname, function(err, address){
      if (address) {
        // Check if the URL already exists in the database
        urlModel.find({url: url}, function (err, dataFound){
          // If not found in the database
          if (dataFound.length < 1){
            // Get the latest short url
            urlModel.find({}).sort({shorturl: "desc"}).limit(1).
            then(
              function(latestData){
                console.log(latestData);
                let lastShortURL = 0;
                if (latestData.length > 0){
                  lastShortURL = parseInt(latestData[0].shorturl);
                }
                // Create new URL in the database with a short url incremented by one more than the current max
                resObj = {url: url, shorturl: lastShortURL + 1};
                let newURL = new urlModel(resObj);
                newURL.save();
                res.json(resObj);
              });
          } 
          // If found in the database we do not need to create it
          else {
            resObj = {url: dataFound[0].url, shorturl: parseInt(dataFound[0].shorturl)}
            res.json(resObj);
          }
          console.log("find", err);
        });
      }
      else{
        res.json({error: "Invalid Hostname"});
      }
      console.log("dns", err);
    });
  }
});

// Visitng a short url
app.get('/api/shorturl/:shorturl?', function(req, res) {
  console.log("get shorturl");
  var shorturl = req.params.shorturl;
  // If url exists re-direct
  urlModel.findOne({shorturl: shorturl}).then(function(foundData){
    if (foundData){
      res.redirect(foundData.url);
    } else {
      res.json({error:"No short URL found for the given input"});
    }
    
  })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

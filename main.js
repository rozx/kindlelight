console.log("initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;

// init file system
var fs = require('fs');

// init request 
var rq = require('request');

//init cheerio

var cheerio = require('cheerio');



console.log("initialized.");

// listening to port

try{

app.listen(port);

console.log("listening on port:" + port);

} catch (error){

console.error("an error just got caught! Maybe you should run it with sudo?");
console.error(error);

}

// app config

app.set('view engine', 'jade');
app.use(express.static('public'));
app.use(express.static('data'));

// index

app.get('/', function (req, res) {
                                                                                                                                                     
  res.render('index',{title: 'Kindle Light Novel',message: 'hello world!'});                                                                                                                                              
});

// grab web content
app.param('id',function(req,res,next,id){

	console.log('Getting book id:' + id);
	next();

});


app.get('/book/:id',function(req,res,next){

	res.send("yes!" + req.params.id);

	
});

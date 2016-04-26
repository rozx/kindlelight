console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;
var jar;
var bookList = [];
var bookDir = './data/books/';
var bookFile = bookDir + 'bookList.json';

// init file system
var fs = require('fs-extra');

// init encoding 

var gbk = require('gbk');

// init request 

var rq = require('request').defaults({
    jar: true
});

// init cheerio

var cheerio = require('cheerio');

// init repeat

var repeat = require('repeat');


// init wenku8 module
var wenku = require('./wenku.js');

// init downloader module
var downloader = require('./downloader.js');

console.log("> initialized.");



// listening to port

try {

    app.listen(port);

    console.log("> listening on port:" + port);

} catch (error) {

    console.error("> an error just got caught! Maybe you should run it with sudo?");
    console.error('> ', error);

}

// init

wenku.init();
downloader.init(false);
repeat(TimedJobs).every(5, 'min').start.in(60, 'sec');
Init();

//console.log('> logging to: ' + wenku.url);

// app config

app.set('view engine', 'jade');
app.use(express.static('public'));
app.use(express.static('data'));

// index

app.get('/', function(req, res) {

    res.render('index', {
        title: 'Kindle Light Novel',
        message: 'hello world!'
    });
});

app.get('/*', function(req, res, next) {

    //console.log(req.url);
    next();

});

// debug

var messages =[];

app.get('/debug/*', function(req, res, next) {
    

    console.log("We got a hit @ " + new Date()); 
    //console.log(req);    

    if(req.url === '/favicon.ico') messages.push('favicon request!');
    if(req.accept == '*/*') messages.push('duplicate request!');


    messages.push(req.url);

    messages.push(req.headers);

    messages.push(req.params);



    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    for (var i = 0; i < messages.length; ++i) {

        res.write("\n\n" + JSON.stringify(messages[i]));

    }

    res.end();

});

// grab web content
app.param('id', function(req, res, next, id) {

    console.log('> Client requesting book id:' + id);


    if (wenku.loggedIn && id) {

        if (!jar) {

            jar = wenku.jar;
            downloader.jar = jar;

            rq = rq.defaults({
                jar: jar
            });
        }
        next();

    } else {

        console.log('> Can not get book id:' + id);
        res.send('Can not get book id:' + id);

        wenku.login(wenku.username, wenku.password);
    }

});

app.get('/book/cover/:id',function(req,res){

    var bid = req.params.id;
    var bookInfo = GetBookById(bid,bookList);
    
    GetCover(bookInfo,function(data){

        res.writeHead(200, {'Content-Type': 'image/jpg' });
        res.end(data,'binary');
    })

});


app.get('/book/:id', function(req, res, next) {

    var bid = req.params.id;
	var bookInfo;
	
	GetBookInfo(bid,function(bi){
	
		bookInfo = bi;
        res.send('<img src="/book/cover/' + bid  + '">' + '<br>' + JSON.stringify(bookInfo));	
	});

});

app.get('/read/:bid/', function(req, res, next) {

    var bid = req.params.bid;
    var bookInfo = GetBookById(bid, bookList);

    if (bookInfo) {
        // if book exist
        res.send(bookInfo);

    } else {


        res.send('book doesn\'t exist :<');
    }


});



app.get('/read/:bid/:cid', function(req, res, next) {

    var bid = req.params.bid;
    var cid = req.params.cid;
    var bookInfo = GetBookById(bid, bookList);


    if (!cid) cid = 0;

    if (bookInfo && bookInfo.chapters[cid]) {

        // start downloader
        //if (downloader.status == downloader.READY) downloader.start();

        // ==== 

        console.log('> Getting book: [' + bid + '/' + cid + '] content.');

        GetBook(cid, bookInfo, function(data) {


            //console.log(data);
            res.send(data);

        });



        //res.send(bookInfo);

    } else {

        console.log('> Book id:[' + bid + "] doesnt exist!");
        res.send(': ( the content you are looking for is missing..');

    }

});

function UpdateBookList(bookInfo) {
    
    // check if the info is empty
    if(!bookInfo.title) return false;

    index = GetIndexById(bookInfo.id, bookList);

    if (index == -1) {

        //if the id doesnt exist, create new

        bookList.push(bookInfo);

    } else {

        // update book info

        bookList[index] = bookInfo;

    }

}


function GetIndexById(id, list) {

    for (i = 0; i < list.length; i++) {

        if (list[i].id == id) {

            return i;
        }
    }

    return -1;

}


function GetBookById(id, list) {

    for (i = 0; i < list.length; i++) {

        if (list[i].id == id) {

            return list[i];
        }

    }

    return false;


}




function GetCover(bookInfo, callback) {

    fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function(err, data) {

        if (err) {

            // file doesn't exist

            downloader.queue({
                url: bookInfo.image,
                dir: bookDir + bookInfo.id + '/' + 'image.jpg',
                encoding: 'binary',
                callback: function(data) {

                    // call back

                    fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function(err, data){ 
                        
                        if(!err) callback(data);

                    });

                }
            });


        } else {

            // file exists

            callback(data);

        }

    });


}

function GetBookInfo(bid,callback){

	var bookInfo = GetBookById(bid, bookList);

    if (!bookInfo) {

        rq({
            url: wenku.url + '/book/' + bid + '.htm',
            encoding: null,
            jar: wenku.jar
        }, function(err, respond, html) {

            if (!err) {

                // get basic book info

                html = gbk.toString('utf-8', html);


                var bookInfo = wenku.getBookInfo(html, bid);

                if (bookInfo.id != '') {
                    // get chapter info

                    rq({
                        url: wenku.url + '/modules/article/packtxt.php?id=' + bookInfo.id,
                        encoding: null,
                        jar: wenku.jar
                    }, function(err, respond2, html) {

                        if (!err) {
                            // if no error
                            html = gbk.toString('utf-8', html);
                            wenku.getChapterInfo(bookInfo, html);
                            //console.log(bookInfo);

                            // save info

                            UpdateBookList(bookInfo);


                            // save to local

                            Save();
							
							// callback
							
							callback(bookInfo);
							
                        } else {
                            

                            console.log('Error: ', err);
                        }

                    });

                }


            } else {

                console.log('> Error in getting book info!' + err);
            }

        });

    } else {
		
		callback(bookInfo);
	}

}


function GetBook(cid, bookInfo, callback) {


    // check local
    fs.readFile(bookDir + bookInfo.id + '/' + bookInfo.chapters[cid].vid + '.txt', 'utf8', function(err, data) {

        if (err) {

            // file doesnt exists



            // download from online

            downloader.queue({
                url: bookInfo.chapters[cid].url,
                dir: bookDir + bookInfo.id + '/' + bookInfo.chapters[cid].vid + '.txt',
                encoding: 'utf8',
                callback: function(data) {

                    // call back

                    callback(data);

                }
            });



        } else {

            // file exists

            callback(data);
        }

    });

}

function TimedJobs() {

    console.log('TimedJobs > Saving book list...');

    Save();


}


function Init() {

    // read JSON book list

    fs.readJson(bookFile, function(err, packageObj) {

        if (!err) {

            console.log('> Local book list exists, reading..');

            bookList = packageObj;

        }

    })


}


function Save() {

    fs.outputJson(bookFile, bookList, function(err) {

        if (!err) {

            console.log('> Book list saved.');

        } else {


            console.log('> ', err);
            //throw err;

        }

    });

}

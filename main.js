console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;
var jar;
var bookList;
var bookDir = './data/books/';
var bookFile = bookDir + 'bookList.json';

// init util
var util = require('util');
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

// init tingodb

var db = require('./libs/db.js');

// init wenku8 module
var wenku = require('./libs/wenku.js');

// init downloader module
var downloader = require('./libs/downloader.js');

// init favicon
var favicon = require('serve-favicon');

console.log("> initialized.");

// app config

app.set('view engine', 'jade');
app.use(express.static('public'));
//app.use(express.static('./data/books'));
app.use(favicon(__dirname + '/public/favicon.ico'));

// listening to port

try {

    app.listen(port);

    console.log("> listening on port:" + port);

} catch (error) {

    console.error("> an error just got caught! Maybe you should run it with sudo?");
    console.error('> ', error);

}

// init

Init();


// index

app.get('/', function(req, res) {

    res.render('index', {
        title: 'Kindle Light Novel',
        message: 'hello world!'
    });
});

app.get('*', function(req, res, next) {

    // preven duplicate requests

    if (req.headers.accept == "*/*") {
        //console.log('duplicate request!');
        
        //console.log(req.headers);

        res.status(404);
        res.end('Duplicate request!');
    } else {

        next();
    }

});

// debug

var messages = [];

app.get('/debug/*', function(req, res, next) {


    console.log("We got a hit @ " + new Date());

    if (req.url === '/favicon.ico') messages.push('favicon request!');
    if (req.headers.accept == "*/*") messages.push('duplicate request!');


    messages.push(req.url);

    messages.push(req.headers);

    //messages.push(req);



    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    for (var i = 0; i < messages.length; ++i) {

        //console.log(messages[i]);
        //res.write("\n\n" + JSON.stringify(messages[i]));
        res.write("\n\n" + util.inspect(messages[i]));
    }

    res.end();

});

// grab web content
app.param('id', function(req, res, next, id) {

    //console.log('> Client requesting book id:' + id);


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

app.get('/book/cover/:id', function(req, res) {

    var bid = req.params.id;
    
    console.log('> Cover requested:',bid);

    GetBookById(bid, function(bookInfo) {


        GetCover(bookInfo, function(data) {

            res.writeHead(200, {
                'Content-Type': 'image/jpg'
            });
            res.end(data, 'binary');
        });
    });

});


app.get('/book/:id', function(req, res, next) {

    var bid = req.params.id;
    var bookInfo;

    console.log('> Bookinfo requested, id:', bid);

    GetBookInfo(bid, function(bi) {

        bookInfo = bi;
        res.send('<img src="/book/cover/' + bid + '">' + '<br>' + JSON.stringify(bookInfo));
    });

});

app.get('/read/:bid/', function(req, res, next) {

    var bid = req.params.bid;

    GetBookInfo(bid, function(bookInfo) {

        if (bookInfo) {
            // if book exist
            res.send(bookInfo);

        } else {


            res.send('book doesn\'t exist :<');
        }

    });


});



app.get('/read/:bid/:cid', function(req, res, next) {

    var bid = req.params.bid;
    var cid = req.params.cid;

    GetBookById(bid, function(bookInfo) {

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

            res.status(404);
            res.json({
                error: 'Invalid Book id.'
            });
            //res.send(': ( the content you are looking for is missing..');

        }

    });

});

app.use(function(req, res, next) {

    res.status(404);
    res.send('Invalid URL');

});


// ============================= functions ======================

function UpdateBookList(bookInfo, callback) {

    var cursor = bookList.find({
        'id': bookInfo.id
    });

    cursor.toArray(function(err, doc) {


        if (doc.length == 0) {

            // insert new record

            bookList.insert(bookInfo);

            console.log('> New record has been inserted.');
            // callback

            if (callback) callback(err);


        } else {

            // update current record

            bookList.update({
                'id': bookInfo.id
            }, bookInfo);

            if (callback) callback(err);

            console.log('> Record has been updated. Id:', bookInfo.id);

        }

    });
}



function GetBookById(id, callback) {

    var cursor = bookList.find({
        'id': id
    });

    cursor.toArray(function(err, doc) {

        if (doc) callback(doc[0]);

    });
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

                    fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function(err, data) {

                        if (!err) callback(data);

                    });

                }
            });


        } else {

            // file exists

            callback(data);

        }

    });


}

function GetBookInfo(bid, callback) {

    var bookInfo;

    GetBookById(bid, function(doc) {

        bookInfo = doc;

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


    });


}


function GetBook(cid, bookInfo, callback) {


    // check local
    fs.readFile(bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt', 'utf8', function(err, data) {

        if (err) {

            // file doesnt exists



            // download from online

            downloader.queue({
                url: bookInfo.chapters[cid].url,
                dir: bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt',
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

function Init() {

    wenku.init();
    downloader.init(false);
    //repeat(TimedJobs).every(5, 'min').start.in(60, 'sec');


    // init collections

    bookList = db.collection('books');
}

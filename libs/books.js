
var db = require('./db.js');
var fs = require('fs-extra');
var rq = require('request');


var books = function () {

    var self = this;


    var bookList;

    // modules
    var downloader, wenku;

    // init collections

    bookList = db.collection('books');

    // functions

    this.updateBookList = function(bookInfo, callback) {

        var cursor = bookList.find({
            'id': bookInfo.id
        });

        cursor.toArray(function (err, doc) {


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



    this.getBookById = function(id, callback) {

        var cursor = bookList.find({
            'id': id
        });

        cursor.toArray(function (err, doc) {

            if (doc) callback(doc[0]);

        });
    }




    this.getCover = function(bookInfo, callback) {

        fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

            if (err) {

                // file doesn't exist

                downloader.queue({
                    url: bookInfo.image,
                    dir: bookDir + bookInfo.id + '/' + 'image.jpg',
                    encoding: 'binary',
                    callback: function (data) {

                        // call back

                        fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

                            if (!err && callback) callback(data);

                        });

                    }
                });


            } else {

                // file exists

                if (callback) callback(data);

            }

        });


    }

    this.getBookInfo = function(bid, callback) {

        var bookInfo;

        self.getBookById(bid, function (doc) {

            bookInfo = doc;

            if (!bookInfo) {

                rq({
                    url: wenku.url + '/book/' + bid + '.htm',
                    encoding: null,
                    jar: wenku.jar
                }, function (err, respond, html) {

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
                            }, function (err, respond2, html) {

                                if (!err) {
                                    // if no error
                                    html = gbk.toString('utf-8', html);
                                    wenku.getChapterInfo(bookInfo, html);
                                    //console.log(bookInfo);

                                    // save info

                                    self.updateBookList(bookInfo);

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


    this.getBook = function(cid, bookInfo, callback) {


        // check local
        fs.readFile(bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt', 'utf8', function (err, data) {

            if (err) {

                // file doesnt exists



                // download from online

                downloader.queue({
                    url: bookInfo.chapters[cid].url,
                    dir: bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt',
                    encoding: 'utf8',
                    callback: function (data) {

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


}



module.exports = new books();
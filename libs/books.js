﻿
var fs = require('fs-extra');
var rq = require('request');
var gbk = require('gbk');

var books = function () {

    var self = this;
    var bookDir = './data/books/';

    // modules
    var downloader, wenku, converter;
    var bookList;
    // functions

    this.init = function (d,w,c) {

        downloader = d;
        wenku = w;
        converter = c;

    }


    this.updateBookList = function(bookInfo,bookList,callback) {

        //if record is null

        if (bookInfo.title == (undefined || null || '')) return false;

        var cursor = bookList.find({
            'id': bookInfo.id
        });

        cursor.count(function (err, num) {

            if (num <= 0) {

                // insert new record

                bookList.insert(bookInfo);

                console.log('> New record has been inserted.');
                // callback

                if (callback) callback(err);


            } else {

                // update current record

                bookList.update({
                    'id': bookInfo.id
                }, bookInfo, { multi: false, upsert: false, writeConcern: {w:1, j: false}});

                if (callback) callback(err);

                console.log('> Record has been updated. Id:', bookInfo.id);

            }

        });
    }


    this.updateBookItem = function (id, key, content ,bookList) {

        var setModifier = { $set: {} };
        setModifier.$set[key] = content;


        bookList.update({ id: id }, setModifier);

        console.log('> Item',key, 'Updated.');
    }



    this.getBookById = function (id, bookList, callback) {


        var cursor = bookList.find({
            'id': id
        });

        cursor.toArray(function (err, doc) {


            if (err) console.log(err);
            if (doc) callback(doc[0]);

        });
    }




    this.getCover = function (bookInfo, callback) {

        fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

            if (err) {

                // file doesn't exist

                downloader.queue({
                    url: bookInfo.image,
                    dir: bookDir + bookInfo.id + '/' + 'image.jpg',
                    encoding: 'binary',
                    callback: function (err) {

                        // call back

                        if (!err) {

                            fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

                                // no error to open the file

                                if (!err && callback) callback(null,data);

                            });
                        } else {

                            // error to download the file

                            if (callback) callback(err,null);
                        }

                    }
                });


            } else {

                // file exists

                if (callback) callback(null,data);

            }

        });


    }

    this.getBookInfo = function (bid, bookList,callback) {

        var bookInfo;

        self.getBookById(bid, bookList,function (doc) {

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

                                    self.updateBookList(bookInfo, bookList);

                                    // callback

                                    callback(bookInfo);

                                    // get images

                                    wenku.getImages(bookInfo, function (err,cid,bookInfo,images) {

                                        // save images to local
                                        self.saveImages(cid, images, bookInfo, function (err,bookInfo) {

                                            // update cover
                                            if (!err) {
                                                //self.updateBookList(bookInfo, bookList);

                                                var key = 'chapters.' + cid + '.images';

                                                self.updateBookItem(bookInfo.id, key, bookInfo.chapters[cid].images, bookList);
                                                self.updateBookItem(bookInfo.id, 'imagesChecked', true, bookList);
                                            }
                                        });


                                    });

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

             
                // if bookInfo is already in data base!

                callback(bookInfo);

                // get images

                if (!bookInfo.imagesChecked) {

                    // if image didn't check before

                    wenku.getImages(bookInfo, function (err, cid, bookInfo, images) {

                        // save images to local
                        self.saveImages(cid, images, bookInfo, function (err, bookInfo) {

                            // update cover
                            if (!err) {

                                var key = 'chapters.' + cid + '.images';
                                

                                self.updateBookItem(bookInfo.id, key, bookInfo.chapters[cid].images, bookList);
                                self.updateBookItem(bookInfo.id, 'imagesChecked', true, bookList);

                            }

                        });

                    });

                }

            }


        });


    }


    this.getBook = function (cid, bookInfo,bookList, callback) {


        // check local
        fs.readFile(bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt', 'utf8', function (err, data) {

            if (err) {

                // file doesnt exists



                // download from online

                downloader.queue({
                    url: bookInfo.chapters[cid].url,
                    dir: bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt',
                    encoding: 'utf8',
                    callback: function (err) {

                        // update record
                        if (!err) {

                            bookInfo.chapters[cid].localFiles.txt = true;
                            self.updateBookList(bookInfo, bookList);

                            // call back

                            callback(null, data);
                        }
                        


                    }
                });



            } else {

                if (!bookInfo.chapters[cid].localFiles.txt) {

                    bookInfo.chapters[cid].localFiles.txt = true;
                    self.updateBookList(bookInfo, bookList);
                }

                // file exists

                callback(err,data);
            }

        });

    }


    this.saveImages = function (cid, images, bookInfo, callback) {

        if (!bookInfo) return null;

        vid = bookInfo.chapters[cid].vid;

        images.forEach(function (element, index, array) {

            // ask downloader to download image

            var localDir = bookDir + bookInfo.id + '/images/' + bookInfo.chapters[cid].vid + '/' +index + '.jpg';

            downloader.queue({
                url: element,
                dir: localDir,
                encoding: 'binary',
                callback: function () {

                    bookInfo.chapters[cid].images[index] = localDir;
                    

                    // call back

                    if (callback) callback(null,bookInfo);

                }
            });



        });

    }


    this.getRecentBooks = function (num, bookList, callback) {


        // get latest updated novels

        if (num <= 0) return false;

        var cursor = bookList.find().sort({ lastUpdate: -1 }).limit(num).toArray(function (err, doc) {

            if (!err) {

                if (callback) callback(null, doc);

            } else {

                if (callback) callback(err, null);

            }


        });



    }

    this.queueToConvert = function (cid, bookInfo, bookList, callback) {

        converter.queue(cid, bookInfo, function (err, t) {

            if (!err) {

                // based on different type, return callback

                if (t == 'epub') {

                    // update bookInfo, tell it local file is ready.

                    console.log('> Update .epub local file..', bookInfo.title, bookInfo.chapters[cid].title);


                    var key = 'chapters.' + cid + '.localFiles.epub';
                    var content = true;


                    self.updateBookItem(bookInfo.id, key, content, bookList);


                } else if (t == 'mobi') {

                    // update bookInfo

                    console.log('> Update .mobi local file..', bookInfo.title, bookInfo.chapters[cid].title);


                    var key = 'chapters.' + cid + '.localFiles.mobi';
                    var content = true;


                    self.updateBookItem(bookInfo.id, key, content, bookList);


                } else {

                    // callback only when successfully queued

                    callback(null);
                }

            } else {

                callback(err,null);

            }

        });

    }


    this.getHotBooks = function (num, bookList, callback) {


        // get latest updated novels

        if (num <= 0) return false;

        var cursor = bookList.find().sort({ hotIndex: 1 }).limit(num).toArray(function (err, doc) {

            if (!err) {

                if (callback) callback(null, doc);

            } else {

                if (callback) callback(err, null);

            }


        });

    }

    this.getRandomBooks = function (num,bookList,callback) {

        if (num <= 0) return false;

        var totalNum;

        bookList.find().count(function (err,numb) {

            totalNum = numb;

            if (num >= totalNum) {

                // if there isnt enough number of records

                var cursor = bookList.find().limit(totalNum).toArray(function (err, doc) {

                    if (callback) callback(err, doc);

                });

            } else {

                // if there is enough number of records

                var rand = parseInt(Math.random() * (totalNum - 1));

                var sortRandom = Math.random();
                var sort;

                // random sort methords

                if (sortRandom > 0.9) {

                    sort = { _id: 1 };
                } else if (sortRandom > 0.8) {

                    sort = { _id: -1 };
                } else if (sortRandom > 0.7) {

                    sort = { lastUpdate: 1 };

                } else if (sortRandom > 0.6) {

                    sort = { lastUpdate: -1 };
                } else if (sortRandom > 0.5) {

                    sort = { id: 1 };

                } else if (sortRandom > 0.4) {

                    sort = { id: -1 };
                } else if (sortRandom > 0.3) {

                    sort = { lastUpdate: -1 };

                } else if (sortRandom > 0.2) {

                    sort = { lastUpdate: -1 };
                } else if (sortRandom > 0.1) {

                    sort = { wenkuUpdate: 1 };

                } else if (sortRandom > 0.0) {

                    sort = { wenkuUpdate: -1 };
                }




                var cursor = bookList.find().sort(sort).skip(rand).limit(num).toArray(function (err, doc) {

                    if (callback) callback(err, doc);

                });

            }



        });

        


    }





}



module.exports = new books();
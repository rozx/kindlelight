// init
var fs = require('fs-extra');
var epub = require('epub-gen');
var kg = require('./kindlegen.js');
var pathF = require('path');

var converter = function() {

    var self = this;
    var path = 'data/books/';
    var taskPath = 'data/tasks/converter.task';
    var tempEpudPath = 'node_modules/epub_gen/tempDir';
    var tempCleanCount = 0;  // clean temp dir if count > 3
    var maxTempCleanCount = 5;
    var taskList = [];
    var status;

    const READY = 0,
        WORKING = 1;

    this.init = function() {

        fs.readJson(taskPath, function(err, t) {

            status = READY;

            if (!err) {
                taskList = t;

                
            } else {

                taskList = [];
            }

            console.log('Converter > Initialized.', taskList.length, 'tasks waiting.');


            if (taskList.length > 0) self.convertBook();
        });
    };

    this.isDuplicate = function (task) {

        var result = false;

        taskList.forEach(function (e, i, a) {

            if (e.cid == task.cid && e.bookInfo.id == task.bookInfo.id) result = true;

        });

        return result;

    }


    this.valid = function (task) {

        // check if the book was converted within 1 day

        var result = false;

        var one_hour = 1000 * 60 * 60;

        var lastConvert = task.bookInfo.chapters[task.cid].lastConvert;
        var diff = ((Date.now() - lastConvert) / one_hour).toFixed(0);

        if (!lastConvert || lastConvert == 0 || diff >= 20) result = true;

        return result;

    }


    this.queue = function (cid, bookInfo, callback) {

        // callback(err, type{'epup' || 'mobi' || 'busy'}, bookInfo)

        var task = {
            cid: cid,
            bookInfo: bookInfo,
            callback: callback
        };

        // check duplicate

        if (self.isDuplicate(task)) {

            if (callback) callback(new Error('task is already in the list'));

            console.log('Converter > Task is already in the list!');

            return false;
        }

        // check if the book is updated within 1 day.

        if (!self.valid(task)) {

            if (callback) callback(new Error('Task has been converted within 1 day.'));

            console.log('Converter > Task has been converted within 1 day.');

            return false;
        }
        


        fs.access('data/books/' + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt', fs.R_OK | fs.W_OK, (err) => {


            if (!err) {

                // no error opening the file


                console.log('Converter > Queued task:', bookInfo.title, bookInfo.chapters[cid].title);

                taskList.push(task);


                self.saveTask();
                self.convertBook();


                if (taskList.length > 0) {
                    if (callback) callback(null, 'busy', bookInfo);
                }

                console.log('Converter > Tasks:', taskList.length);

            } else {

                console.log('Converter > Failed to queue task:', bookInfo.title, bookInfo.chapters[cid].title);
                callback(err, null);

            }
        });

        //self.convertBook();

        return true;
    }

    this.convertBook = function () {


        // check status
        if (status == READY && taskList.length > 0) {

            if (!taskList[0].bookInfo) {

                taskList[0].callback(new Error('bookInfo is empty'), null);

                // if no bookinfo, remove then return.
                self.remove(0);

                // after converted to mobi, keep convert
                self.convertBook();

            }
            
            // set status to busy

            status = WORKING;

            // if no callback set default callback
            
            if(!taskList[0].callback) taskList[0].callback = function(){
            
                console.log('Converter > No callback!');
            };


            // Start

            var chapters;

            self.readBook(taskList[0].cid, taskList[0].bookInfo, function(err, c) {

                if (!err) {
                    // no err parse the book, start converting
                    console.log('Converter > Start converting!');

                    // start generating epub
                    var vPath = path + taskList[0].bookInfo.id;
                    var epubPath = vPath + "/epub/" + taskList[0].bookInfo.chapters[taskList[0].cid].vid + '.epub'

                    if (taskList[0].bookInfo.chapters[taskList[0].cid].images[0]) {

                        // if there is a cover for chapter exist

                        var coverPath = taskList[0].bookInfo.chapters[taskList[0].cid].images[0];

                        if (coverPath.startsWith('./')) coverPath = pathF.resolve(__dirname + '/../',coverPath);

                    } else {

                        // else use the default cover image

                        var coverPath = './' + vPath + '/image.jpg';

                    }
                    var option = {
                        title: taskList[0].bookInfo.title + ' ' + taskList[0].bookInfo.chapters[taskList[0].cid].title, // *Required, title of the book.
                        author: taskList[0].bookInfo.author,
                        publisher: taskList[0].bookInfo.publisher,
                        cover: coverPath,
                        appendChapterTitles: false,
                        content: [],
                        description: taskList[0].bookInfo.desc,
                    };

                    console.log('Converter > Finished init epub generate options.');

                    // add title page

                    var chapter = {
                        title: taskList[0].bookInfo.title,
                        data: '<div><img src ="' + 'file://' + coverPath + '"></img><h2>' + taskList[0].bookInfo.chapters[taskList[0].cid].title + '</h2><hr><br><h2>内容简介</h2><hr><br>' + taskList[0].bookInfo.desc + '</div>'
                    };

                    option.content.push(chapter);

                    // add chapters

                    c.forEach(function (element, index, array) {

                        var chapter;

                        if (element.title.includes('插图')) {

                            // if the chapter is image chapter

                            console.log('Converter > Adding images to the book.');

                            var images = taskList[0].bookInfo.chapters[taskList[0].cid].images;
                            var data = '<div><br><h2>' + element.title + '</h2><br><hr><br>';

                            images.forEach(function (element, index, array) {

                                if (element.startsWith('./')) {

                                    data += '<img src= "file://' + pathF.resolve(__dirname + '/../', element) + '"><br>';
                                } else {

                                    data += '<img src="' + element + '"><br>';
                                }


                            });

                            data += element.content + '</div>';

                            chapter = {

                                title: element.title,
                                data: data

                            };


                        } else {

                            // if it isnt image chapter

                            chapter = {
                                title: element.title,
                                data: '<div><br><h2>' + element.title + '</h2><br><hr><br>' + element.content + '</div>'
                            };
                        }

                        option.content.push(chapter);

                        console.log('Converter > Added chapter', element.title);
                    });

                    var chapter = {
                        title: 'Kindle Light',
                        data: '<div>本图书由Kindle Light 在线生成工具自动生成的哦！看更多的Kindle轻小说，请来: <a href= "http://kindlelight.mobi">Kindle Light!</a><br><hr> <img src="file://./public/under.jpg"></img> </div>'
                    };

                    option.content.push(chapter);

                    console.log('Converter > Chapters setup complete.');

                    // start converting

                    fs.ensureDir(vPath + "/epub/", function(err) {

                        if (!err) {

                            // no error ensure the dir : /epub/

                            new epub(option, epubPath).promise.then(function() {

                                console.log("Converter > Ebook Generated Successfully!");

                                // callback epub file generated

                                taskList[0].callback(null, 'epub');


                                // start convert the book to .mobi

                                // sudo ./bin/kindlegen/kindlegen -c2 ./data/books/1657/epub/57218.epub -o 57218.mobi

                                fs.ensureDir(vPath + '/mobi/', function(err) {

                                    if (!err) {

                                        // no error when ensuring the mobi dir

                                        //start converting

                                        console.log('Converter > Converting .epub to .mobi.');

                                        var epubPath = vPath + "/epub/" + taskList[0].bookInfo.chapters[taskList[0].cid].vid + '.epub';
                                        var mobiPath = vPath + "/mobi/" + taskList[0].bookInfo.chapters[taskList[0].cid].vid + '.mobi';
                                        var orimobiPath = vPath + "/epub/" + taskList[0].bookInfo.chapters[taskList[0].cid].vid + '.mobi';


                                        // start converting , from epub to mobi

                                        kg.convert(epubPath, function (err, out) {


                                            fs.move(orimobiPath, mobiPath, {
                                                clobber: true // set overwrite
                                            }, function (err) {

                                                if (!err) {
                                                    // no err moving the file

                                                    console.log('Converter > Convert successful! File:', mobiPath);

                                                    taskList[0].callback(null, 'mobi');

                                                } else {

                                                    // err moving the file

                                                    console.log('Converter > Error moving the file! File:', mobiPath);

                                                }


                                                self.remove(0);

                                                // after converted to mobi, keep convert
                                                self.convertBook();
                                            });


                                        });

                                        // done converting epub

                                    } else {

                                        // err ensuring mobi path
                                        console.log('Converter > Error ensoring mobi folder');


                                        self.remove(0);

                                        // after converted to mobi, keep convert
                                        self.convertBook();

                                    }

                                    

                                });

                                // keep convert



                            }, function (err) {

                                // err when converting to epub

                                console.error("Converter > Failed to generate Ebook because of ", err);

                                taskList[0].callback(err);

                                // err

                                self.remove(0);

                                console.log('Converter > Error when converting:', err);

                                // keep convert

                                self.convertBook();
                            });

                        } else {

                            // error when ensure /epub/ dir

                            taskList[0].callback(err);

                            // err

                            self.remove(0);

                            console.log('Converter > Error when converting:', err);

                            // keep convert

                            self.convertBook();

                        }

                    })

                } else {

                    // Error parse the book

                    taskList[0].callback(err);

                    // err

                    self.remove(0);

                    console.log('Converter > Error when reading file:', err);

                    // keep convert

                    self.convertBook();

                }

            });

        } else {

            console.log('Converter > No task to do or Converter is working.');

            if (status == READY) taskList = [];

            //self.saveTask();




        }

    }

    this.readBook = function(cid, bookInfo, callback) {

        var cid = cid;
        var chapters = [];
        var title = bookInfo.chapters[cid].title.replace('\r\n', '');
        var file = path + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt';

        // open file

        console.log('Converter > Reading local file:', file);

        fs.readFile(file, function(err, data) {

            if (!err) {

                // file opened

                console.log('Converter > Parsing Book.');

                // parse the book/chapters

                var book = String(data).replace('undefined', '').split(title);
                var chapters = [];

                // remove the first chapter : ★☆★☆★☆轻小说文库(Www.WenKu8.com)☆★☆★☆★
                book.splice(0, 1);

                book.forEach(function(element, index, array) {

                    var ctitle = element.substr(1, element.indexOf('\r\n', 1)).replace('\r', '');
                    var cdata = element.substr(element.indexOf('\r\n', 1), element.length).replace(/(\r\n|\n|\r)/g, '<br>');

                    chapters.push({
                        id: index,
                        title: ctitle,
                        content: cdata
                    });

                });

                callback(err, chapters);

            } else {

                console.log('Conveter > Err opening file', file);

                callback(err, null);

                self.remove(0);
            }

        });

    };

    this.remove = function(id) {

        if (taskList[id])
            taskList.splice(id, 1);
        status = READY;

        self.saveTask();

        // empty the temp files

        if (tempCleanCount >= maxTempCleanCount) {

            fs.emptyDir(tempEpudPath, function (err) {
                if (!err) console.log('Converter > Clean temp file successful!')
            });

            tempCleanCount = 0;

        } else {


            tempCleanCount++;
        }

    }

    this.saveTask = function() {

        console.log('Converter > Saving tasks..');

        fs.outputJson(taskPath, taskList, function(err) {

            if (!err) {

                console.log('Converter > Task list saved.');

            } else {

                console.log('Converter > Task list save failed.');
            }

        });
    }


    this.getTaskNum = function () {

        return taskList.length;

    }

}

// export module
module.exports = new converter();

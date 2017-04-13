// Downloader module V1.0
// Mutithread version
// Author: Rozx


// required modules
var rq = require('request');
var fs = require('fs-extra');

// init repeat

var repeat = require('repeat');

// main function
function downloader() {

    var self = this;
    var jar;
    var queueList = [];
    var taskFilePath = './data/tasks/downloader.task';
    const READY = 0, RUNNING = 1; 
    var maxThreads = 20;




    this.init = function(autoStart) {

        // check if task exists

        fs.ensureFile(taskFilePath, function(err) {

            if (!err) {

                // if so, read it

                console.log('Downloader > Reading task list..');

                fs.readJson(taskFilePath, function(err, packageObj) {

                    queueList = packageObj;

                    if (autoStart) self.start();

                    // check if queueList is undefined
                    if (queueList == undefined) queueList = [];
                })
            }
			
			    // save tasks every one min

				repeat(self.save).every(30, 'sec').start.in(5, 'sec');
        });



    }


    this.start = function() {

        if (queueList.length > 0) {

            self.download();

        }

    }

    this.stop = function() {

        
    }

    this.currentThread = function () {

        // return the num of total running download threads.

        var threadNum = 0;

        queueList.forEach(function (element, index, array) {

            if (element.status == RUNNING) threadNum+=1;

        });

        return threadNum;


    }


    this.nextAvailableTask = function () {

        var result = null;

        queueList.forEach(function (e, i, a) {

            if (e.status == READY) result = e;

        });

        return result;
    }


    this.isDuplicate = function (task) {

        var result = false;


        queueList.forEach(function (e, i, a) {

            if (e == task) result = true;

        });

        return result;

    }

    this.queue = function(task) {


        // task = {url : 'xxx.com/a.txt', dir : './data/book/1234/a.txt',encoding : 'utf8',
        // status = READY | RUNNING,
        // callback: function, retried: 0}


        // init task
        if (!task.url) return false;

        if (!queueList) queueList = [];

        if (!task.status) task.status = READY;

        if (!task.retried) task.retried = 0;

        // check if the task is in list already.

        if (self.isDuplicate(task)) return false;

        // start downloads

        queueList.push(task);


        if (self.currentThread() < maxThreads) {

            self.download();

            console.log('Downloader > New task queued and start downloading:', task.url, '(' + self.currentThread() + '/', queueList.length + ')');
        } else {

            console.log('Downloader > New task queued :', task.url, '(' + self.currentThread() + '/', queueList.length + ')');
        }

        //self.save();

    }

    this.remove = function (task,allowRetry) {

        var result = false;

        queueList.forEach(function (e, i, a) {

            if (e == task) {

                if (e.retried > 3 || !allowRetry) {
                    delete (queueList[i]);
                    queueList.splice(i, 1);
                } else {

                    e.retried++;
                    e.status = READY;
                }

                //self.save();
                result = true;
            }

            

        });


        //self.save();
        return result;

    }


    this.download = function () {

        var task = self.nextAvailableTask();

        if (self.currentThread() < maxThreads && task) {

            task.status = RUNNING;

            // start downloading


            console.log('Downloader > Downloading file..');


                fs.ensureFile(task.dir, function (err) {

                    if (!err) {


                        // ensured path exists

                        rq
                            .get(task.url)
                            .on('response', function (response) {


                                if (response.statusCode != 200) {

                                    console.log('Downloader > Error when downloading! Code:'.response.statusCode, '(' + self.currentThread() + '/', queueList.length + ')');

                                    if (task.callback) task.callback(new Error('Failed to connect to the server.'));

                                    self.remove(task, true);
                                    self.download();

                                }
                            })


                            .pipe(fs.createWriteStream(task.dir).on('close', function () {

                                // callback
                                if (task.callback) task.callback(null);

                                console.log('Downloader > file saved to:', task.dir, '(' + self.currentThread() + '/', queueList.length + ')');
                                self.remove(task,false);
                                self.download();

                            }).on('error', function (err) {

                                // error when writing stream

                                self.remove(task, true);
                                self.download();

                            })).on('error', function (err) {

                                // error when getting remote file

                                self.remove(task, true);
                                self.download();
                            });

                    } else {

                        console.log('Downloader > Error when downloading!', '(' + self.currentThread() + '/', queueList.length + ')');

                        if (task.callback) task.callback(new Error('Failed to ensure the file.'));


                        self.remove(task, true);
                        self.download();
                    }

                });

        }



        return null;
    }

    this.save = function() {
		
        fs.outputJson(taskFilePath, queueList, function(err) {

            if (!err) {

                //console.log('Downloader > task file saved to local.');

            } else {


                console.log('Downloader > ', err);
            }


        });
		
		// start downloader if there is tasks left
		
		if(queueList.length > 0 && queueList[0].status == READY) self.start();

    }

    this.getTaskNum = function () {

        return queueList.length;

    }


}


// export module
module.exports = new downloader();

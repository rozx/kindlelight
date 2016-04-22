
// required modules
var rq = require('request');
var fs = require('fs');


// main function
function downloader(){
    
    var self = this;
    var jar;
    var queue = [];
    var taskFilePath = './data/tasks/downloader.task';
    var READY = 0, DOWNLOADING = 1, WRITTING = 2, ERROR = 3;
    var status;


    this.init = function(autoStart){
        
        self.status = READY;

        if(autoStart) self.Start();

    }


    this.Start = function(){
    
    
    
    }

    this.Stop = function(){
    }

    this.Queue = function(task){
    
        // task = {url : 'xxx.com/a.txt', dir : './data/book/1234/a.txt',callback : function}

        


        if(queue.length == 0 && self.status == READY){

            queue.push(task);

            Download(0);

        } else {
            
            queue.push(task);

            console.log('Downloader > New task queued :' + task.url);

        }
    
    
    }
    
    this.RemoveQueueByIndex = function(id){
    }


    this.Download = function(index){
        
        if(self.status == READY){

            // make sure it is at the begging of the list
            
            if(index != 0){
            
                var item = queue(index);

                queue.splice(index,1);
                queue.unshift(item);
            
            }


            self.status = DOWNLOADING;

            console.log('Downloader > Start downloading task:' + queue(0).url);






        } else{
            
            // if it is busy, add the task at the second position

            var item = queue(index);
            queue.splice(index,1);
            queue.splice(1,0,item);
        
        }


        
        return 0;
    }


}


// export module
module.exports = new downloader();

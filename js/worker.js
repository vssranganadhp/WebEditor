importScripts("../file/FileSystem.js");
var window = document = '';
onmessage = function(e){
    var files = e.data;
    iterateFiles(files,0);
}

function iterateFiles(files,idx){
    if(files[idx]){
        createLocalFile(files[idx]['file_name'],files[idx]['content'],function(){
            idx++;
            iterateFiles(files,idx)
        },files[idx]['file_type']);
    } else {
        postMessage("Completed");
    }
}

function createLocalFile(file_name,content,callback,file_type){
    FileHandle(file_name,'create',content,function(){
        if(typeof callback == 'function'){
            callback();
        }
    },file_type);
}
var fileSystem, requestFileSystem;
var ProjectManager = [], files_added = [];
var BASIC_WIDTH = 200;
var time;
if(!window){
    requestFileSystem  = requestFileSystem || webkitRequestFileSystem;
    requestFileSystem(TEMPORARY, 50*1024*1024, onInitFs, errorHandler);
    localStorage = '';
} else if(!fileSystem){
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.requestFileSystem(window.TEMPORARY, 50*1024*1024, onInitFs, errorHandler);
}

function onInitFs(fs) {
    Log("Opened file system: " + fs.name);
    fileSystem = fs;
    time = new Timer()
    time.start();
    if(localStorage){
        var st_time = new Date().valueOf();
        page_settings = localStorage.getItem("page_settings");
        page_settings = page_settings == undefined ? {} : JSON.parse(page_settings);
        var exp_width = page_settings.file_exp_width || BASIC_WIDTH;
        currentFileIndex = page_settings.lfIdx;
        setTimeout(function(){
            $("#page_editor").css("left",exp_width+"px");
            $("#seperator").css("left",exp_width+"px");
            $("#project_nav").css("width",exp_width);
            $("#page_editor").css("width",window.innerWidth - exp_width);
        },0);
        fileSystem.root.getParent(function(en){
            Log("Got parent directory");
            showLoading();
            ProjectManager = [];
            readItems(arguments,0,'',function(){
                initEditor();
                if(ProjectManager.length == 0){
                    var HTML = '<li class="file selected" title="/Untitled.html"><a class="file-status-icon can-close" title="Delete this file"></a>Untitled.html</li>';
                    untitled_count++;
                    $("#project_nav ul").html(HTML);
                    if(isGoogleInitialized == false){
                        GoogleSearchInit();
                    }
                } else {
                    reloadProjects();
                }
                console.log(time.end());
                // console.info((new Date().valueOf() - st_time)+" ms");
                files_added = ProjectManager.map(function(a){
                    return a.substr(a.lastIndexOf('/')+1);
                });
                initScrollers();
            });
        });
        // var temp_pages = localStorage.getItem('WebEditor_pages_json');
        // temp_pages = temp_pages == undefined ? [] : JSON.parse(temp_pages);
        // if(temp_pages.length > 0){
        //     ProjectManager = temp_pages;
        //     var HTML = '';
        //     for(var i=0;i<ProjectManager.length;i++){
        //         var file_name = ProjectManager[i].substr(ProjectManager[i].lastIndexOf('/')+1)
        //         HTML += '<li class="file" title="'+ProjectManager[i]+'"><a class="file-status-icon can-close"></a>'+file_name+'</li>'
        //     }
        //     $("#project_nav ul").html(HTML);
        //     $($(".file")[0]).addClass('selected');
        //     initEditor();
        // } else {
        //     var HTML = '<li class="file selected"><a class="file-status-icon can-close"></a>Untitled.html</li>'
        //     untitled_count++;
        //     $("#project_nav ul").html(HTML)
        //     initEditor();
        // }
    }
    // if(ProjectManager.length > 0){
    //     FileHandle(ProjectManager[0],'read');
    //     // filesList();
    // } else if(window) {
    //     console.log("Files Count : "+ProjectManager.length);
    // 	filesList();
    // }
}

function errorHandler(e) {
    var msg = '';
    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    };
    console.error('Error: ' + msg);
    console.error(e);
}

function FileManager(){
    
}
FileManager.prototype = {
    createNew : function(){
        $("#menu_cont").hide();
        saveFile();
        editor.setValue('');
        editor.clearHistory();
        $(".filename").trigger('blur');
        untitled_count = untitled_count == 0 ? '' : untitled_count;
        Log("Creating new file");
        $("#project_nav li").removeClass('selected');
        var fname = $('<input />',{class:'filename'}).attr('value','Untitled'+untitled_count+'.html')
        $('<li />',{class:'file selected'}).appendTo($("#project_nav > ul > div")).html('<a class="file-status-icon can-close" title="Delete this file"></a>'+''+fname[0].outerHTML);
        $(".selected input").select().focus();
        untitled_count++;
    },
    createNewDirectory: function(){
        console.log("Creating new directory");
    },
    createNewWithContent : function(file_path,content,callback,file_type){
        // console.log(file_path);
        $("#menu_cont").hide();
        // Log("Creating new file with content");
        // $("#project_nav li").removeClass('selected');
        var parElmt = $("#project_nav ul");
        var curIdx = ProjectManager.length;
        ProjectManager.push(file_path);
        if(!files_list[curIdx]){
            files_list[curIdx] = {};
        }
        files_list[curIdx]['file_name'] = file_path;
        files_list[curIdx]['content'] = content;
        files_list[curIdx]['file_type'] = file_type;
        var pathArr = file_path.match(/\/([\.\w\s-]+)/g);
        if(pathArr){
            var dup_path_arr = pathArr.slice(0);
            if(dup_path_arr.length > 1){
                dup_path_arr.pop();
            }
            
            dup_path_arr = dup_path_arr.join('').replace(/\/([\w\s\.-]+)/g,' [id^=\'__$1\']').trim().split(" ").join(" > ");
            if($(dup_path_arr).length > 0){
                parElmt = $(dup_path_arr);
            }
        }
        var file_name = file_path.substr(file_path.lastIndexOf('/')+1);
        $("#log_file_name").text(file_name);
        /*
        var pathArr = file_name.match(/\/([\.\w\s-]+)/g);
        if(pathArr){
            var px = pathArr.filter(function(p){
                return $("#__"+p.substr(1)).length == 1;
            });
            if(px.length > 0){
                var parId = px[px.length-1];
                if(parId){
                    parId = parId.replace(/\//g,'');
                    if($("#__"+parId).length > 0){
                        parElmt = $("#__"+parId);
                    }
                }
            }
            file_name = pathArr[pathArr.length-1];
            file_name = file_name.replace(/\//g,'');
        }
        */
        $('<li />',{'class':'file','title':file_path}).appendTo(parElmt).html('<a class="file-status-icon can-close" title="Delete this file"></a>'+''+file_name);
        
        if(typeof callback == 'function'){
            callback();
        }
        // if(file_name != "" && !(file_name.match("png") || file_name.match("jpg") || file_name.match("jpeg") || file_name.match("gif")) ){
        //     $("#image_file").attr("src","").hide();
        //     saveFile('','',function(){
        //         editor.setValue(content);
        //         editor.clearHistory();
        //         // ProjectManager.push(file_name);
        //         saveFile('','',function(){
        //             if(typeof callback == 'function'){
        //                 // reloadEvents();
        //                 // reloadProjects();
        //                 callback();
        //             }
        //         })
        //     });
        // } else {
        //     editor.setValue('');
        //     editor.clearHistory();
        //     $("#image_file").attr("src",content).show();
        //     var img_wid = $("#image_file").width()/2;
        //     var img_hei = $("#image_file").height()/2;
        //     $("#image_file").css({"top":"calc(50% - "+img_hei+"px)","left":"calc(50% - "+img_wid+"px)"});
        //     saveFile('',content,function(){
        //         if(typeof callback == 'function'){
        //             reloadProjects();
        //             callback();
        //         }
        //     })
        // }
    }
}

function FileProperties(fname,ftype,theme){
    return {
        file_name : fname||'',
        file_type : ftype||'txt',
        file_theme: theme||'default'
    }
}

function FileHandle(fileName,type,data,callback,file_type){
    var toCreate = true
    if(type != 'create' && type != 'append'){
        toCreate = false
    }
    if(!fileName && typeof callback == 'function'){
        callback('error');
        return false;
    }
    if(type == 'create' && !data){
        data = editor.getValue();
        if(!data){
            data = $("#image_file").attr("src");
        }
        console.log("Saving empty file\nMay be that file was empty :)");
        console.log("Filename : "+fileName+"\nStatus : saved");
    }
    // console.log(fileName);
    fileSystem.root.getFile(fileName, {create: toCreate}, function(fileEntry) {
        if(data != undefined && data != null){
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    if(data != null){
                        fileWriter.seek(0);
                        if(!file_type){
                            file_type = 'text/html';
                        }
                        var blob = new Blob([data], {type: file_type});
                        data = null;
                        fileWriter.write(blob);
                        // Log('Write completed.');
                        // filesList();
                        if(typeof callback == 'function') callback();
                    }
                };
                fileWriter.onerror = function(e) {
                    Log('Write failed: ' + e.toString());
                    if(typeof callback == 'function') callback(e);
                };
                
                if(type == 'append'){
                    data = '\n'+data;
                    fileWriter.seek(fileWriter.length);                             //seek to EOF
                }
                fileWriter.onprogress = function(e) {
                    // Log('File writing in progress');
                };
                fileWriter.truncate(0);
            }, errorHandler);
        } else {
            if(type == 'remove'){
                fileEntry.remove(function() {
                    Log('File removed.');
                    files_list.remove(currentFileIndex);
                    if(typeof callback == 'function') callback();
                }, errorHandler);
            } else {
                fileEntry.file(function(file) {
                    var reader = new FileReader();
                    reader.onloadend = function(e) {
                        var fileContent = this.result;
                        var ext = getFileType(fileName);
                        ext = ext.toLowerCase();
                        $("#image_file").attr("src","").hide();
                        if(ext == "png" || ext == "jpeg" || ext == "gif" || ext == "jpg"){
                            editor.setValue('');
                            // var base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(new ArrayBuffer(fileContent))));
                            // console.log(base64String)
                            var chars = new Uint8Array(fileContent);
                            var CHUNK_SIZE = 0x8000;
                            var index = 0;
                            var length = chars.length;
                            var result = '';
                            var slice;
                            while (index < length) {
                                slice = chars.subarray(index, Math.min(index + CHUNK_SIZE, length)); 
                                result += String.fromCharCode.apply(null, slice);
                                index += CHUNK_SIZE;
                            }
                            console.log(result);
                            $("#image_file").attr("src",fileContent).show();
                            var img_wid = $("#image_file").width()/2;
                            var img_hei = $("#image_file").height()/2;
                            $("#image_file").css({"top":"calc(50% - "+img_hei+"px)","left":"calc(50% - "+img_wid+"px)"});
                        } else {
                            currentFile = new FileProperties(fileName,ext);
                            changeFileType(fileName);
                            editor.setValue(fileContent);
                        }
                        $("tt").text(fileName);
                        if(typeof callback == 'function') callback();
                    };
                    if(file.type.match('image')){
                        reader.readAsDataURL(file);
                    } else {
                        reader.readAsText(file);
                    }
                }, errorHandler);
            }
        }
    }, errorHandler);
}

function DirectoryHandle(dirName,toCreate,callback){
    fileSystem.root.getDirectory(dirName,{create:toCreate},function(){
        if(typeof callback == 'function'){
            callback();
        }
    },errorHandler);
}

function filesList(){
    $("details li").unbind('click');
    $("details li").remove();
    var dirReader = fileSystem.root.createReader();
    dirReader.readEntries(function(entries) {
        $("#project_nav div details").html('');
        var HTML = "";
        for(var i=0;i<entries.length;i++){
        	if(entries[i].isDirectory){
        		var parentHTML = 'asdsad';
        		HTML += '<details open>'+
        					'<summary>'+entries[i]['name']+'</summary>'+
        					parentHTML+
        				'</details>';
        	}
            HTML += '<li class="file_from_dir"><a class="file-status-icon can-close" title="Delete this file"></a>'+entries[i]['name']+'</li>'
        }
        $("#project_nav div details").append(HTML);
        $("#project_nav div details").attr("open","open");
        $("li.file_from_dir").click(function(){
            var filename = $(this).attr("title");
            var filesIndex = ProjectManager.indexOf(filename)
            if(filesIndex < 0){
                ProjectManager.push(filename);
                reloadProjects(1);
            } else {
                $("#project_nav ul li").removeClass('selected');
                $("#project_nav ul li").eq(filesIndex).addClass('selected');
                FileHandle(filename,'read');
            }
        })
    }, errorHandler);
}

function renameFile(filename, newFileName, callback) {
    var cwd = fileSystem.root;
    if(isValidFileName(filename,'rename') && isValidFileName(newFileName,'rename') && (filename != newFileName)){
        cwd.getFile(filename, {}, function(fileEntry) {
            fileEntry.moveTo(cwd, newFileName, callback, callback);
            reloadProjects();
        }, callback);
    } else if(filename == newFileName){
        if(typeof callback == 'function'){
            callback('Error');
        }
    }
}

function isValidFileName(filename, type){
    if(filename.indexOf('.') < 0){
        alert("Please enter valid filename!");
        return false;
    } else if(filename.split('.')[1].length == 0){
        alert("Please enter file's extension!");
        return false;
    } else if( (type != 'rename') && (ProjectManager.indexOf(filename) >= 0) ){
        alert("File name already exists!");
        return false;
    } else {
        return true;
    }
}

function removeAllFiles(){
    var dirReader = fileSystem.root.createReader();
    dirReader.readEntries(function(entries) {
        for (var i = 0, entry; entry = entries[i]; ++i) {
            if (entry.isDirectory) {
                entry.removeRecursively(function() {
                    console.log("Directory removed");
                }, errorHandler);
            } else {
                entry.remove(function() {
                    console.log("Entry removed");
                }, errorHandler);
            }
        }
        ProjectManager = [];
        location.reload();
    }, errorHandler);
}

function changeFileType(filename) {
  var val = filename, m, mode, spec;
  if (m = /.+\.([^.]+)$/.exec(val)) {
    var info = CodeMirror.findModeByExtension(m[1]);
    if (info) {
      mode = info.mode;
      spec = info.mime;
    }
  } else if (/\//.test(val)) {
    var info = CodeMirror.findModeByMIME(val);
    if (info) {
      mode = info.mode;
      spec = val;
    }
  } else {
    mode = spec = val;
  }
  if(editor.getMode().name != mode){
      if (mode) {
        editor.setOption("mode", spec);
        CodeMirror.autoLoadMode(editor, mode);
      } else {
        Log("Could not find a mode corresponding to " + val);
        editor.setOption("mode","text/plain");
      }
  }
}

function getFileType(file_name){
    if(!file_name) return false;
    var ext = file_name.replace(/.*?\./g,'');
    return ext;
}

/*      Timer       */

function Timer(){
    this.time = new Date().valueOf();
}
Timer.prototype.start = function(){
    this.time = new Date().valueOf();
}
Timer.prototype.end = function(){
    if(this.time){
        var curTime = (new Date().valueOf() - this.time) + " ms";
        this.time = '';
        return curTime;
    } else {
        console.error("Exception : Start timer before ending it.");
    }
}


/*  Common functions */

function Log(str){
    console.debug(str);
}

function showLoading(){
    $("#loading").show();
}

function hideLoading(){
    $("#loading").hide();
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function getFileName(file_path){
    var sl_idx = file_path.lastIndexOf('/')+1;
    return {
        name : file_path.substr(sl_idx),
        path : file_path.substr(0,sl_idx)
    };
}
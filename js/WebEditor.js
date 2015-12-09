var editor;
var untitled_count = 0;
var phpTags = "";
var shortcuts = {};
var topmenu = {};
var menuShown = false;
var files_list = [];
var filetypes = {};
var curFontSize = 15;
var page_settings = {};
var currentFile = {};
var currentFileIndex = 0;
var sub_depth = 0;
var AUTHOR_HEADER = '{BS}*\n * Author : Ranganadh\n * Date   : {DATE}\n{BE}\n';
var panels = [];
var totalFiles = 0;
var worker = '';
var connection = '';
var nickname = "Guest "+Math.floor(Math.random()*100);
var usersOnline = [];
var typingUser = null;
var blinkInter = null;
var notificationsEnabled = false;
var isActive = true;
var isGoogleInitialized = false;
var notifications_arr = [];
var scrollOpts = {
    axis : "y",
    autoHideScrollbar : true,
    autoExpandScrollbar : true,
    scrollbarPosition : "outside",
    advanced:{
        autoExpandHorizontalScroll : true,
        updateOnContentResize : true
    }
};
$(document).ready(function(){
    Notification.requestPermission(function(perm){
        if(perm == "granted"){
            notificationsEnabled = true;
        }
    })
    
    $(window).bind("focus",function(){
        isActive = true;
        if(notifications_arr.length > 0){
            notifications_arr.forEach(function(not){
                not.close();
            });
            notifications_arr = [];
        }
    });
    $(window).bind("blur",function(){
        isActive = false;
    });
    $(".header").bind("click",function(e){
        $("#chat_container").toggleClass("open");
        stopBlinking();
        handleEvent(e);
        return false;
    });
    $(".google_header").click(function(){
        $("#google_search").toggleClass("open");
    });

    $("#chat_container").click(function(){
        $("#message_text").trigger("focus");
    })
    $("#message_text").bind("focus",function(){
        stopBlinking();
    });
    $("#message_text").bind("input",function(){
        if($(this).val() != ""){
            connection.send('{"typing":true,"name":"'+nickname+'"}');
        } else {
            connection.send('{"typing":false,"name":"'+nickname+'"}');
        }
    });
    $("#seperator").bind("mousedown",function(){
        $("*").bind("mousemove",function(e){
            var loc_pageX = e.pageX;
            if(loc_pageX < 400 && loc_pageX > 199){
                $("#project_nav").css("width",loc_pageX)
                $("#page_editor").css("left",loc_pageX)
                $("#page_editor").css("width",window.innerWidth - loc_pageX)
                page_settings.file_exp_width = loc_pageX;
                $("#seperator").css("left",loc_pageX)
            }
        });
        $("*").bind("mouseup",function(){
            $("*").unbind("mousemove");
        })
    });
    $("#project_nav").bind("contextmenu",function(e){
        e.preventDefault();
        $("[data-item^='reName']").remove();
        $("#contextmenu").css({'top':e.pageY,'left':e.pageX})
        $("#menu_cont").show();
        $("*").click(function(eve){
            eve.stopPropagation();
            if($("#contextmenu").find($(eve.target)).length == 0){
                $("*").unbind("click");
                $("#menu_cont").hide();
            }
        })
    })
    $("#menu_cont").bind("contextmenu",function(eve){
        eve.preventDefault();
    });
    $(".file").live("contextmenu",function(){
        var that = this;
        if($(this).find("input").length > 0){
            return false;
        }
        HTML = '<div class="soft-context-menu-item" data-item="reName"><span>Rename</span><span>F2</span></div>';
        $("[data-item^=createNewFile]").after(HTML);
        // saveFile('','',function(){
        //     $("#project_nav ul li").removeClass("selected");
        //     $(that).addClass("selected");
        //     var file_name = $(that).attr("title");
        //     FileHandle(file_name,'read','',function(){
        //         HTML = '<div class="soft-context-menu-item" data-item="reName"><span>Rename</span><span>F2</span></div>';
        //         $("[data-item^=createNewFile]").after(HTML);
        //         // reloadEvents();
        //     })
        // });
    })
    $(".filename").live('blur keydown keyup',function(e){
        e.stopImmediatePropagation();
        var fn = $(this).val();
        $("tt").text(fn);
        if( (e.keyCode == 13 || e.type == 'blur' || e.type == 'focusout') ){
            if(isValidFileName(fn)) {
                try{
                    if($(this).parent().find('input').length > 0){
                        $(this).parent().attr("title","/"+fn);
                        $(this).parent().html(fn);
                        // $(this).parent().find('input').replaceWith(fn);
                    }
                    currentFileIndex = $(".file.selected").index();
                    changeFileType(fn);
                    var mode = editor.getMode();
                    var start_comment_code = mode.blockCommentStart;
                    var end_comment_code = mode.blockCommentEnd;
                    var auth_head = AUTHOR_HEADER.replace(/{DATE}/g,new Date());
                    if(mode.name == "htmlmixed" || mode.name == "null"){
                        start_comment_code = '<!--';
                        end_comment_code = '-->';
                    } else {
                        start_comment_code = '/*';
                        end_comment_code = '*/';
                    }
                    if(!start_comment_code || !end_comment_code){
                        var lineCom = mode.lineComment;
                        auth_head = auth_head.replace(/{BS}/g,lineCom).replace(/{BE}/g,lineCom).replace(/\*/g,lineCom);
                    } else {
                        auth_head = auth_head.replace(/{BS}/g,start_comment_code).replace(/{BE}/g,end_comment_code).replace(/\*/g,'');
                    }
                    editor.setValue(auth_head);
                    editor.focus();
                    editor.setCursor(5,0);
                    currentFileIndex = ProjectManager.length - 1;
                    editor.save();
                    saveFile('','',function(){
                        reloadProjects();
                    });
                } catch(err) {
                    console.error(err);
                }
            } else {
                $(".selected input").select().focus();
            }
        }
    });
    $(".fileRename").live('blur keydown',function(e){
        var that = this;
        var oldName = $(that).attr("data-value");
        var oldPath = $(that).attr("data-path");
        e.stopPropagation();
        e.stopImmediatePropagation();
        var file_name = oldPath +""+ oldName;
        var fn = $(this).val();
        if( (e.keyCode == 13 || e.type == 'blur' || e.type == 'focusout') ){
            if(isValidFileName(fn,'rename')) {
                try{
                    var new_file_name = oldPath+""+fn
                    ProjectManager[returnFileIndex(file_name)] = new_file_name;
                    renameFile(file_name, new_file_name, function(err){
                        // console.log(err);
                        $(that).parent().attr("title",new_file_name);
                        if(!err){
                            $(that).parent().find('input').unbind("blur keydown")
                            $(that).parent().html(fn);
                            reloadEvents();
                            changeFileType(fn);
                        } else if(err == 'Error') {
                            $(that).parent().find('input').unbind("blur keydown")
                            $(that).parent().html(fn);
                        } else {
                            if(confirm("There is no file named "+fn+"!\nDo you want to create it?")){
                                saveFile(new_file_name,'',function(){
                                    $(that).parent().find('input').unbind("blur keydown")
                                    $(that).parent().html(fn);
                                    reloadEvents();
                                    changeFileType(fn);
                                });
                            } else {
                                $(that).parent().find('input').unbind("blur keydown")
                                $(that).parent().html(oldName);
                                reloadEvents();
                                changeFileType(oldName);
                            }
                        }
                    });
                } catch(err) {
                    Log("Prob with File rename");
                }
            }
        } else if(e.keyCode == 27) {
            $(that).parent().find('input').unbind("blur keydown")
            $(that).parent().html(fn);
            return false;
        }
    });
    $("#open_new_tab").bind("click",function(){
        var url = fileSystem.root.toURL()+""+currentFile.file_name.substr(1);
        window.open(url,'_blank');
    })
    $(window).bind('beforeunload', function() {
        connection.close();
        saveProjects();
    });
    $(window).resize(function(e){
        setEditorSize();
    });
});

function loadModesAndShortcuts(){
    // $.get('predefined_methods.php',function(data){
    //     phpTags = JSON.parse(data);
    //     phpTags.internal.sort();
    //     Log("PHP methods loaded");
        $.get('json/shortcuts.json',function(data){
            if(typeof data === 'object'){
                shortcuts = data;
            } else {
                shortcuts = JSON.parse(data);
            }
            parseObject(shortcuts);
            Log("shortcuts loaded");
            $.get('json/fileext.json',function(data){
                if(typeof data === 'object'){
                    filetypes = data;
                } else {
                    filetypes = JSON.parse(data);
                }
                Log("Modes loaded");
                $.get('json/topmenu.json',function(data){
                    if(typeof data === 'object'){
                        topmenu = data;
                    } else {
                        topmenu = JSON.parse(data);
                    }
                    createMenu(topmenu);
                    Log("Top menu created");
                    $(".help > div").mCustomScrollbar(scrollOpts);
                    if(!worker && window.Worker){
                        Log("Loading worker now");
                        worker = new Worker('js/worker.js');
                        worker.onmessage = function(){
                            reloadProjects();
                        }
                        hideLoading();
                    }
                });
            });
        });
    // });
}

function selectTheme(theme) {
    page_settings.theme = theme;
    currentFile['file_theme'] = theme;
    editor.setOption("theme", theme);
}
function passAndHint(cm) {
    setTimeout(function() {cm.execCommand("autocomplete");}, 100);
    return CodeMirror.Pass;
}
var autoIndent = function(){
    CodeMirror.commands["selectAll"](editor);
    var range = getSelectedRange();
    editor.autoIndentRange(range.from, range.to);
}
var getSelectedRange = function(){
    return { from: editor.getCursor(true), to: editor.getCursor(false) };
}
function returnFileIndex(filename){
    var index = false;
    for(var i = 0; i < ProjectManager.length; i++){
        if(ProjectManager[i] == filename){
            index = i;
            i = ProjectManager.length;
        }
    }
    return index;
}

function saveFile(file_name,content,callback){
    var filename = $("#project_nav .selected").attr("title");
    if(file_name){
        filename = file_name;
    }
    content = content ? content : editor.getValue();
    var file_type = files_list[currentFileIndex]['file_type'] || 'text/html';
    if(filename != ""){
        FileHandle(filename,'create',content,function(err){
            if(!err){
                currentFileIndex = $("#project_nav .selected").index();
                var file_pos = returnFileIndex(filename);
                if(file_pos.toString() == "false"){
                    ProjectManager.push(filename);
                }
                if(files_list[currentFileIndex]){
                    files_list[currentFileIndex]['saved'] = true;
                    $(".file.selected").removeClass("edited");
                }
                $(".fname").text($(".file.selected").attr("title"));
            }
            setTimeout(function(){
                editor.clearHistory();
                if(typeof callback == 'function'){
                    callback();
                }
            },500);
        },file_type);
    } else {
        editor.clearHistory();
        if(typeof callback == 'function'){
            callback();
        }
    }
}
function saveProjects(){
    localStorage.setItem("WebEditor_pages_json",JSON.stringify(ProjectManager))
    page_settings.lfIdx = currentFileIndex;
    localStorage.setItem("page_settings",JSON.stringify(page_settings));
}

function initEditor(){
    Log("Editor initialised");
    CodeMirror.commands.save = function (cm) {
        console.log("Saving file");
        $("#loading span").html("Saving file");
        showLoading();
        saveFile('','',function(){
            connection.send('{"saved":true,"name":"'+nickname+'","file":"'+currentFile.file_name+'"}');
            if($("#editor_section").hasClass("preview")){
                var url = fileSystem.root.toURL()+""+currentFile.file_name.substr(1);
                $("#frame").attr("src",'');
                $("#frame").attr("src",url);
            }
            hideLoading();
            $("#loading span").html("Loading ...");
        });
    }
    CodeMirror.commands.showHTMLHint = function (cm) {
        var selectedLineText = editor.getTokenAt(editor.getCursor()).string;
        if(selectedLineText.indexOf('#') >= 0){
            Log(selectedLineText.match(/#\w{3,6}/g))
        }
    }
    CodeMirror.commands.renameFile = function (cm) {
        if($(".file.selected").length > 0){
            renameSelectedFile();
        }
    };
    CodeMirror.commands.helpSection = function (cm) {editor.display.input.blur();$(".help").show();}
    CodeMirror.commands.hideHelpSection = function (cm) {
        $(".help").hide();
        // var cursor = editor.getCursor();
        // editor.display.input.blur();
        // editor.setCursor(cursor);
        // editor.display.input.focus();
    }
    CodeMirror.commands.hidePopups = function(cm){
        $(".help").hide();
        $("#google_search").removeClass("open");
        $("#chat_container").removeClass("open");
        hideMenu();
        hideLoading();
    }
    CodeMirror.commands.selectDefaultTheme = function (cm) {cm.setOption("theme","default")}
    CodeMirror.commands.showPreview = function (cm) {
        if($("#editor_section").hasClass("preview")){
            $("#editor_section").removeClass("preview");
            $("#page_preview").hide();
            $("#open_new_tab").hide();
        } else {
            $("#editor_section").addClass("preview");
            $("#page_preview").show();
            var url = fileSystem.root.toURL()+""+currentFile.file_name.substr(1);
            $("#frame").attr("src",url);
            $("#open_new_tab").show();
        }
        setEditorSize();
    }
    CodeMirror.commands.autocomplete = function(cm) {
        var cur = editor.getCursor();
        var mode = editor.getMode();
        var state = editor.getTokenAt(cur).state;
        if(mode){
            if( (state && state.localMode && state.localMode.name == "javascript") || (mode.name == "javascript" && !mode.jsonMode) ){
                CodeMirror.showHint(cm, CodeMirror.hint.javascript);
            } else if(mode.name == "htmlmixed") {
                if(state && state.localMode && state.localMode.name == "css"){
                    CodeMirror.showHint(cm, CodeMirror.hint.css,{completeSingle : false});
                } else {
                    CodeMirror.showHint(cm, CodeMirror.hint.html,{completeSingle : false});
                }
            } else if(mode.name == "css"){
                CodeMirror.showHint(cm, CodeMirror.hint.css,{completeSingle : false});
            } else if(mode.name == "sql"){
                CodeMirror.showHint(cm, CodeMirror.hint.sql,{completeSingle : false});
            } else {
                var newMode = editor.getModeAt(editor.getCursor());
                if(newMode && newMode.helperType){
                    switch(newMode.helperType){
                        case 'php':
                                CodeMirror.showHint(cm, CodeMirror.hint.php,{completeSingle : false});
                                break;
                        default :
                                console.log(newMode);
                    }
                }
            }
            $(".CodeMirror-hints").css("font-size",curFontSize+"px");
        } else {
            console.log(mode);
        }
    }
    CodeMirror.defaults.onBlur = function(){
        saveFile();
    }
    CodeMirror.commands.FileMenu = function (cm) {
        if(!menuShown){
            showMenu();
        } else {
            hideMenu();
        }
    }
    CodeMirror.commands.fullScreen = function (cm)
    {
        var fs_p = $(cm.getWrapperElement());
        
        if ( cm._ic3Fullscreen == null) {
            cm._ic3Fullscreen = false;
            cm._ic3container = fs_p.parent();
        }
        
        if (!cm._ic3Fullscreen)
        {
            fs_p = fs_p.detach();
            fs_p.addClass("CodeMirrorFullscreen");
            fs_p.appendTo("body");
            cm.focus();
            cm._ic3Fullscreen = true;
        }
        else
        {
            fs_p = fs_p.detach();
            fs_p.removeClass("CodeMirrorFullscreen");
            fs_p.appendTo(cm._ic3container);
            cm.focus();
            cm._ic3Fullscreen = false;
        }
        setEditorSize();
    };

    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        // mode: "application/x-httpd-php",
        autoCloseBrackets: true,
        autoCloseTags: true,
        lineWrapping:true,
        tabSize: 4,
        indentUnit: 4,
        keyMap : "sublime",
        indentWithTabs: true,
        styleActiveLine: true,
        scrollbarStyle : "simple",
        matchBrackets: true,
        // matchTags: {bothTags: true},
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Ctrl-I":"indentAuto",
            "Cmd-I":"indentAuto",
            "Cmd-E":"showHTMLHint",
            "Cmd-P":"showPreview",
            "Ctrl-L":"gotoLine",
            "F2":"renameFile",
            "F1":"helpSection",
            "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
            // "Cmd-/":"commentSelection",
            "Cmd-F11":"fullScreen",
            "Alt-F":"FileMenu"
        },
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    editor.on("scroll",function(){
        var startL = document.elementFromPoint(250,80).textContent || 0;
        var endL = document.elementFromPoint(250,innerHeight-26).textContent;
        panels.forEach(function(panel){
            var panelLine = parseInt($(panel).data("line"));
            var isTopPanel = $(panel).hasClass("top");
            if(isTopPanel){
                if(panelLine >= startL){
                    $(panel).hide();
                    $(panel).data("visible","false");
                } else {
                    $(panel).show();
                    $(panel).data("visible","true");
                }
            } else {
                if(panelLine >= endL){
                    $(panel).show();
                    $(panel).data("visible","true");
                } else {
                    $(panel).hide();
                    $(panel).data("visible","false");
                }
            }
        })
        setEditorSize();
    });

    editor.on("change",function(e,change){
        // console.log(e.curOp);
        var cursor = editor.getCursor();
        var mode = editor.getMode();
        var file_name = $(".file.selected").attr("title");
        if(!files_list[currentFileIndex]){
            files_list[currentFileIndex] = {};
            files_list[currentFileIndex]['file_name'] = $(".file.selected").attr("title");
            files_list[currentFileIndex]['content'] = editor.getValue();
        } else {
            files_list[currentFileIndex]['saved'] = false;
            $(".fname").text(file_name+"*");
            $(".file.selected").addClass("edited");
        }
        if(change.origin != "setValue" && typingUser == nickname){
            sendMessage(JSON.stringify(change));
        } else {
            typingUser = nickname;
        }
        // showPreview();
        // if(mode && mode.name){
        //     var char = editor.getRange(CodeMirror.Pos(cursor.line, 0), cursor);
        //     if(char.trim() == '<' || (char.slice(-1) == ' ' && char.trim() != "")){
        //         CodeMirror.commands.autocomplete(editor)
        //     } else {
        //         return false;
        //     }
        // }
    });

    editor.on("cursorActivity",function(p){
        setTimeout(function(){
            var marks = editor.getAllMarks();
            var view = editor.getViewport();
            // console.log(view);
            var l1, l2;
            panels.forEach(function(panel){
                $(panel).remove();
            });
            panels = [];
            if(marks.length == 2){
                l1 = editor.getLineNumber(marks[0].lines[0]);
                l2 = editor.getLineNumber(marks[1].lines[0]);
                // console.log(l1+" : "+editor.getLine(l1));
                // console.log(l2+" : "+editor.getLine(l2));
                if(view.to < l2){               //  check for bottom
                    addPanel('bottom',editor.getLine(l2),l2);
                } else if(view.from > l1){      //  check for top
                    addPanel('top',editor.getLine(l1),l1);
                } else {
                    setEditorSize();
                }
            } else {
                setEditorSize();
            }
        },200);
    })

    //autoIndent();

    var cmHeight = (window.innerHeight - 50);
    $(".CodeMirror").css("height",cmHeight+"px");
    var CmdKeyMap = {
        "Cmd-`":function(cm){$("#select").val('default').trigger('change')},
        "Cmd-1":function(cm){$("#select").val('ambiance').trigger('change')},
        "Cmd-2":function(cm){$("#select").val('blackboard').trigger('change')},
        "Cmd-3":function(cm){$("#select").val('cobalt').trigger('change')},
        "Cmd-4":function(cm){$("#select").val('eclipse').trigger('change')},
        "Cmd-5":function(cm){$("#select").val('elegant').trigger('change')},
        "Cmd-6":function(cm){$("#select").val('erlang-dark').trigger('change')},
        "Cmd-7":function(cm){$("#select").val('lesser-dark').trigger('change')},
        "Cmd-8":function(cm){$("#select").val('monokai').trigger('change')},
        "Cmd-9":function(cm){$("#select").val('neat').trigger('change')},
        "Cmd-0":function(cm){$("#select").val('night').trigger('change')},
        "Cmd-K":function(cm){var fm = new FileManager();fm.createNew();},
        "Cmd-O":function(cm){openFiles();},
        "Esc"  :"hidePopups",
        "Cmd-Alt-]":function(cm){
            var selFileIdx = currentFileIndex;
            if(selFileIdx < ProjectManager.length - 1)
                selFileIdx++;
            else
                selFileIdx = 0;
            selectFileAtIndex(selFileIdx);
        },
        "Cmd-Alt-[":function(cm){
            var selFileIdx = currentFileIndex;
            if(selFileIdx > 0)
                selFileIdx--;
            else
                selFileIdx = ProjectManager.length-1;
            selectFileAtIndex(selFileIdx);
        },
        "Cmd--":function(cm){decreaseFont()},
        "Cmd-=":function(cm){increaseFont()}
        // "Cmd-Backspace":function(cm){$("#select").val('xq-dark').trigger('change')}
    }
    editor.addKeyMap(CmdKeyMap);
    setTimeout(function(){
        editor.getWrapperElement().style["font-size"] = curFontSize+"px";
        editor.refresh();
        // hideLoading();
    },200);
    $("html").attr("ondrop","fileDropped(event);return false;");
    $("html").attr("ondragleave","dragLeave(event);return false;");
    $("html").attr("ondragover","dragOver(event);return false;");
    $("html").attr("ondragend","dragEnd(event);return false;");

    
    curFontSize = page_settings.font_size || curFontSize;
    var theme = page_settings.theme || 'default';
    $("#select").val(theme).trigger('change');
}

function selectFileAtIndex(selFileIdx){
    if(selFileIdx == undefined){
        selFileIdx = currentFileIndex;
    }
    if($("#project_nav ul li.selected").index() != selFileIdx){
        if(ProjectManager.length > 0){
            $("#project_nav ul li").eq(selFileIdx).click();
        } else {
            changeFileType($("#project_nav ul li").eq(0).text());
        }
    }
    hideLoading();
}

function reloadEvents(){
    Log("Events created");
    showLoading();
    $("#project_nav ul li").unbind('click');
    $("#project_nav ul li").click(function(){
        var that = this;
        // if($(this).hasClass("selected") || ($(this).find("input").length > 0)){
        //     return false;
        // }
        var file_name = $(that).attr("title");

        var callback = function(){
            FileHandle(file_name,'read',null,function(){
                currentFileIndex = $(that).index();
                $("#project_nav ul li").removeClass("selected");
                $(that).addClass("selected");
                if(!files_list[currentFileIndex]){
                    files_list[currentFileIndex] = {};
                }
                files_list[currentFileIndex]['file_name'] = file_name;
                files_list[currentFileIndex]['content'] = editor.getValue();
                if(editor.getValue() == ""){
                    files_list[currentFileIndex]['content'] = $("#image_file").attr("src");
                }
                editor.clearHistory();
                $(".file.selected").removeClass("edited");
                files_list[currentFileIndex]['saved'] = true;
                currentFile['file_name'] = file_name;
                currentFile['file_type'] = getFileType(files_list[currentFileIndex]['file_name']);
                // var cur = files_list[currentFileIndex]['cursor'];
                // if(cur){
                //     curArr = cur.split("||");
                //     var newCur = editor.getCursor();
                //     newCur.line = curArr[0];
                //     newCur.ch = curArr[1];
                //     editor.focus();
                //     editor.setCursor(newCur);
                // }
                hideMenu();
                // var sel_off = $(".file.selected")[0].offsetTop-15;
                // var min_ul_scroll_top = $("#project_nav ul").scrollTop();
                // var max_ul_scroll_top = min_ul_scroll_top + $("#project_nav ul").outerHeight();
                // if(sel_off < min_ul_scroll_top || sel_off > max_ul_scroll_top){
                //     $("#project_nav ul").scrollTop(sel_off);
                // }
                if($("#editor_section").hasClass("preview")){
                    var url = fileSystem.root.toURL()+""+currentFile.file_name.substr(1);
                    $("#frame").attr("src",url);
                }
            });
        }
        saveCursor();
        hideLoading();
        if(files_list[currentFileIndex] && files_list[currentFileIndex]['saved'] == false){
            saveFile('',editor.getValue(),function(){
                callback();
            })
        } else {
            callback();
        }
    });

    $("#project_nav ul li").unbind("mouseover mouseout");
    $("#project_nav ul li").mouseover(function(){
        $(".can-close").hide()
        $(this).find(".can-close").show();
    }).mouseout(function(){
        $(".can-close").hide()
    })
    $(".can-close").unbind("click");
    $(".can-close").click(function(e){
        handleEvent(e);
        var index = $(this).parent().index();
        if($(this).parent().attr("title") == ProjectManager[index]){
            currentFileIndex = index;
            if(confirm("Do you want to remove this file?")){
                FileHandle(ProjectManager[index],'remove',null,function(){
                    ProjectManager.remove(index);
                    if(ProjectManager[index] == undefined){
                        currentFileIndex = ( ProjectManager.length - 1 ) || 0;
                    }
                    editor.setValue('');
                    reloadProjects();
                });
            }
        }
    });
    $("[data-item], .soft-context-menu-item span").unbind('click');
    $("[data-item], .soft-context-menu-item span").bind("click",function(e){
        e.stopPropagation();
        var item_clicked = $(this).attr('data-item');
        console.log(item_clicked);
        if($(this)[0].nodeName.toLowerCase() == 'span'){
            item_clicked = $(this).parent().attr('data-item');
        }
        switch(item_clicked){
            case 'createNewFile':
                var fm = new FileManager();
                fm.createNew();
                break;
            case 'createNewDirectory':
                var fm = new FileManager();
                fm.createNewDirectory();
                break;
            case 'reName':
                renameSelectedFile();
                break;
            default:
                Log("item type not found");
        }
    });
    $("#topMenu li").unbind("click");
    $("#topMenu li").click(function(e){
        e.preventDefault();
        $("#topMenu li").removeClass("selected");
        $(this).addClass("selected");
        $(this).parent().find("ul.sub").show();
        $("#topMenu > ul > div > li").unbind("mouseover mouseout")
        $("#topMenu > ul > div > li").mouseover(function(el){
            var obj = $(el.target).data();
            var left = $(el.target).offset().left - 40;
            createSubMenu(obj);
            $("#topMenu > ul > ul").css("left",left);
            $("#topMenu > ul > div > li").removeClass("selected");
            $(this).addClass("selected");
        }).mouseout(function(el){
            $("#topMenu > ul > div > li").removeClass("selected");
            $(this).addClass("selected");
        });
        $(this).trigger("mouseover");
    });
    $("#file_search").unbind("input");
    $("#file_search").bind("input",function(){
        var search_key = $(this).val();
        if(search_key){
            var reg = new RegExp(escape(search_key),'gi');
            var files_matched = [];
            files_added.forEach(function(a,b){
                if(a.match(reg)){
                    files_matched.push(b);
                    $("#project_nav ul li.file").eq(b).show();
                } else {
                    $("#project_nav ul li.file").eq(b).hide();
                }
            });
            // console.log(files_matched);
        } else {
            $("#project_nav ul li.file").show();
        }
    });
    $("#topMenu li").eq(0).data({"Open Recent":ProjectManager});
}
function reloadProjects(index){
    Log("Projects reloaded");
    if(index == undefined){
        index = $("#project_nav ul li.selected").index();
    } else {
        if(ProjectManager.length > Number(index+1)){
            index = ProjectManager.length - 1;
        } else if(index != 0) {
            index--;
        }
    }
    $("#project_nav ul").html('');
    var HTML = '';
    for(var i=0;i<ProjectManager.length;i++){
        var file_name = ProjectManager[i].substr(ProjectManager[i].lastIndexOf('/')+1);
        HTML += '<li class="file" title="'+ProjectManager[i]+'"><a class="file-status-icon can-close" title="Delete this file"></a>'+file_name+'</li>'
    }
    if(currentFileIndex >= ProjectManager.length){
        currentFileIndex = ProjectManager.length - 1;
    }
    $("#project_nav ul").html(HTML);
    if(HTML == ''){
        var HTML = '<li class="file selected" title="/Untitled.html"><a class="file-status-icon can-close" title="Delete this file"></a>Untitled.html</li>';
        untitled_count++;
        $("#project_nav ul").html(HTML);
    }
    $("#project_nav ul li").eq(index).addClass('selected');
    if(!files_list[currentFileIndex]){
        files_list[currentFileIndex] = {};
        files_list[currentFileIndex]['file_name'] = ProjectManager[index];
    }
    if(index >= 0){
        $(".fname").text(ProjectManager[index]);
    }
    if(isGoogleInitialized == false){
        GoogleSearchInit();
    }
    setTimeout(function(){
        reloadEvents();
        selectFileAtIndex();
    },500);
}

function parseObject(data){
    var HTML = '<div>';
    var data = JSON.parse(JSON.stringify(data).escapeHTML().replace(/ or /g,'<i> or </i>'))
    for(var i in data){
        var key = i;
        var val = data[i];
        if(typeof val == 'object'){
            HTML += '<details open><summary>'+key+'</summary>';
            for(var j in val){
                var l1key = j;
                var l1val = val[j];
                if(typeof l1val == 'object'){
                    HTML += '<details open><summary>'+l1key+'</summary>';
                    for(var k in l1val){
                        var l2key = k;
                        var l2val = l1val[k];
                        if(typeof l2val == 'object'){
                            HTML += '<details open><summary>'+l2key+'</summary>';
                            Log("Check this");
                        } else {
                            HTML += '<li><span>'+l2key+'</span>:<span>'+l2val+'</span></li>'
                        }
                    }
                    HTML += '</details>';
                } else {
                    HTML += '<li><span>'+l1key+'</span>:<span>'+l1val+'</span></li>'
                }
            }
            HTML += '</details>';
        } else {
            HTML += '<li><span>'+key+'</span>:<span>'+val+'</span></li>'
        }
    }
    HTML += '</div>';
    $(".help hr").after(HTML)
}
function createMenu(data){
    // var HTML = "";
    // HTML += '<ul>';
    // for(var i in data){
    //     var key = i;
    //     var val = data[i];
    //     if(typeof val == 'object'){
    //         HTML += '<div><li>'+key+'</li>';
    //         HTML += '<ul class="sub">';
    //         for(var j in val){
    //             var key1 = j;
    //             var val1 = val[j];
    //             if(val1 == "seperator"){
    //                 HTML += '<div class="horizontal"></div>';
    //             } else if(val1 == "gap") {
    //                 HTML += '<div class="gap"></div>';
    //             } else if($.isArray(val1)) {
    //                 HTML += '<li><span>'+key1+'</span><span class="char_dd">‣</span></li>';
    //             } else {
    //                 HTML += '<li><span>'+key1+'</span><span>'+val1+'</span></li>';
    //             }
    //         }
    //         HTML += '</ul>';
    //         HTML += '</div>';
    //     }
    // }
    // HTML += '</ul>';
    // $("#topMenu").html(HTML);

    $("#topMenu").html('');
    var $ul = $('<ul />');
    for(var i in data){
        var key = i;
        var val = data[i];
        if(typeof val == 'object'){
            var $div = $('<div />');
            var $li = $('<li />').text(key);
            $li.data(val);
            $div.append($li);
            $ul.append($div);
        }
    }
    var $cont_ul = $('<ul />',{'id':'top_menu_cont'});
    $ul.append($cont_ul);
    $("#topMenu").append($ul);
    reloadEvents(); 
}

function showMenu(callback){
    menuShown = true;
    $("#topMenu").css("top","0px");
    $("#page_editor,#project_nav").css("top","20px");
    if(typeof callback == 'function'){
        callback();
        $("#editor_section").one("click",function(){
            console.log(123);
        });
    }
}

function hideMenu(){
    menuShown = false;
    $("#topMenu > ul > div > ul").hide();
    $("#topMenu li").unbind("mouseover");
    $("#topMenu li").unbind("mouseout");
    $("#topMenu li").removeClass("selected");
    $("#page_editor,#project_nav").css("top","0px");
    $("#topMenu").css("top","-20px");
    $("#top_menu_cont").html('');
}

function createSubMenu(obj,depth){
    $('#sub_'+depth).remove();
    var $ul = $('<ul />',{'class':'sub'});
    if(depth > 0){
        $ul.attr('id','sub_'+depth);
    } else {
        $("#topMenu > ul > ul").html('');
    }
    if(Object.keys(obj).length == 0){
        $ul.addClass("no-child")
    }
    // $ul.append($('<div />',{'class':'gap'}));
    for(var i in obj){
        if(typeof obj[i] != 'function'){
            if(obj[i] == 'seperator'){
                $ul.append($('<li />',{'class':'horizontal'}));
            } else if($.isArray(obj[i])){
                var $li = $('<li />').append($('<span />').text(i));
                $li.append($('<span />',{'class':'char_dd'}).text('‣'));
                $li.data(obj[i]);
                $ul.append($li);
            } else {
                var $li = $('<li />').append($('<span />').text(i));
                if(isNaN(obj[i]))
                    $li.append($('<span />').text(obj[i]));
                $li.data({"item":i});
                $ul.append($li);
            }
        }
    }
    // $ul.append($('<div />',{'class':'gap'}));
    $("#topMenu > ul > ul").append($ul);
    $("#topMenu > ul > ul li").die("mouseover mouseout");
    $("#topMenu > ul > ul li").live("mouseover",function(el){
        $(this).parent().find(".selected").removeClass("selected");
        $(this).addClass("selected");
        var parId = $(this).parent().attr("id");
        if($(this).find(".char_dd").length == 1){
            if($('#sub_'+sub_depth).length == 0){
                var arr = $(this).data();
                arr = arr.toObject();
                sub_depth++;
                // $("#topMenu > ul > ul").html('');
                createSubMenu(arr,sub_depth);
                var neg_top = -$(this).position().top;
                $('#sub_'+sub_depth).css("top",neg_top);
                $('#sub_'+sub_depth).css("left",$(this).outerWidth());
            }
        } else if(parId == undefined){
            $('#sub_'+sub_depth).remove();
            sub_depth = 0;
        }
    });
    $("#topMenu > ul > ul li").live("mouseout",function(el){
        if($(this).find(".char_dd").length == 0){
            $(this).parent().find(".selected").removeClass("selected");
            $(this).addClass("selected");
        }
    });

    $("#topMenu > ul > ul li").unbind("click")
    $("#topMenu > ul > ul li").bind("click",function(el){
        var itemSel = $(this).data();
        if(itemSel){
            var item = itemSel['item'];
            if(item.match(/\./)){       // open file
                $("#project_nav ul li").eq(returnFileIndex(item)).trigger("click");
            } else {
                console.log(item);
            }
        }
    });
}

function renameSelectedFile(){
    $("#menu_cont").hide();
    var oldName = $(".file.selected").attr("title");
    // oldName = oldName.replace(/\//g,'');
    var fp = getFileName(oldName);
    var input = $('<input />',{class:'fileRename'}).attr({'value':fp['name'],'data-value':fp['name'],'data-path':fp['path']});
    $(".selected").html(input);
    input.focus();
}

function decreaseFont(){
    curFontSize--;
    editor.getWrapperElement().style["font-size"] = curFontSize+"px";
    editor.refresh();
    page_settings.font_size = curFontSize;
}

function increaseFont(){
    curFontSize++;
    editor.getWrapperElement().style["font-size"] = curFontSize+"px";
    editor.refresh();
    page_settings.font_size = curFontSize;
}

function handleEvent(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
}

function fileDropped(e){
    var itemsDropping = e.dataTransfer.items;
    totalFiles = 0;
    if(e.dataTransfer.types.indexOf("text/plain") >= 0){
        Log("Text dropped");
        handleEvent(e);
        return false;
    }
    showLoading();
    bk_items = e.dataTransfer.items;
    readItems(itemsDropping,0,'',function(){
        console.log("Completed adding %s items",totalFiles);
        worker.postMessage(files_list);
    });
    //readFilesByIndex(itemsDropping,0);
    handleEvent(e);
    return false;
}

var itemsSorted = false;
function readItems(items,idx,path,callback){
    Log("Reading items");
    if(items.sort && itemsSorted == false){
        sortByKey(items,'name');
        itemsSorted = true;
        // console.log("path : "+path);
    }
    if(items[idx]){
        var item = items[idx];
        if(items[idx].webkitGetAsEntry){
            item = items[idx].webkitGetAsEntry();
        }
        if(item){
            if(item.isFile){
                Log("Finding file");
                item.file(function(file){
                    Log("File found");
                    if(file.name != ".DS_Store"){
                        if(path.slice(-1) != "/"){
                            path = path+"/";
                        }
                        var fName = path+""+file.name;
                        totalFiles++;
                        var reader = new FileReader();
                        reader.onloadend = function(){
                            Log("File read");
                            var fm = new FileManager();
                            var fType = file.type;
                            fm.createNewWithContent(fName,this.result,function(){
                                idx++;
                                readItems(items,idx,path,callback);
                            },fType);
                        }

                        var ext = getFileType(fName);
                        ext = ext.toLowerCase();
                        if(CodeMirror.findModeByExtension){
                            var mode = CodeMirror.findModeByExtension(ext);
                            if(!mode && !(ext == "png" || ext == "jpeg" || ext == "gif" || ext == "jpg")){
                                // console.log("Can't read file : "+fName);
                                totalFiles--;
                                idx++;
                                readItems(items,idx,path,callback);
                            } else if(ext == "png" || ext == "jpeg" || ext == "gif" || ext == "jpg"){
                                Log("Reading file as data url");
                                reader.readAsArrayBuffer(file);
                                // reader.readAsDataURL(file);
                            } else {
                                Log("Reading file as text");
                                reader.readAsText(file);
                            }
                        } else {
                            Log("CodeMirror is not loaded");
                            Log("Reading file as text");
                            reader.readAsText(file);
                        }
                    } else {
                        idx++;
                        readItems(items,idx,path,callback);
                    }
                })
            } else if(item.isDirectory){
                var dirReader = item.createReader();
                path = item.fullPath;
                var folder_name = item.name;
                var folder_path = path.substr(1);
                var toCreate = true;
                if(path == '/'){
                    toCreate = false;
                }
                DirectoryHandle(path,toCreate,function(){
                    var fold_id = '__'+folder_name;
                    var parElmt = $("#project_nav > .directory");
                    var pathArr = path.match(/\/([\.\w\s-]+)/g);
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
                    if(folder_name)
                        $('<details />',{id:fold_id,'open':'true'}).html($('<summary />').text(folder_name)).appendTo(parElmt);
                    itemsSorted = false;
                    var totalEntries = [];
                    var dirReadEntries = function(){
                        dirReader.readEntries(function(entries){
                            totalEntries = totalEntries.concat(entries);
                            if(entries.length == 100){
                                dirReadEntries();
                            } else {
                                readItems(totalEntries,0,path,function(){
                                    idx++;
                                    if(items[idx]){
                                        path = items[idx].fullPath;
                                        path = path.substr(0,path.lastIndexOf('/'));
                                    }
                                    readItems(items,idx,path,callback);
                                });
                            }
                        });
                    }
                    dirReadEntries();
                })
            }
        }
    } else {
        if(typeof callback == 'function'){
            callback();
        }
    }
}

function readFilesByIndex(filesDropping,index){
    var droppedFile = filesDropping[index];
    if(droppedFile){
        var reader = new FileReader();
        reader.onloadend = function(e) {
            var fm = new FileManager();
            fm.createNewWithContent(droppedFile.name,this.result,function(){
                index++;
                readFilesByIndex(filesDropping,index);
            });
        };
        if(droppedFile.type && droppedFile.type.match("image")){
            reader.readAsDataURL(droppedFile);
        } else {
            reader.readAsText(droppedFile);
        }
    }
}

function dragStart(e) {
    handleEvent(e);
}
function dragLeave(e) {
    handleEvent(e);
}
function dragOver(e) {
    handleEvent(e);
}
function dragEnd(e) {
    handleEvent(e);
}

function addPanel(where,text,line) {
    var node = document.createElement("div");
    node.className = "panel " + where;
    var close = node.appendChild(document.createElement("span"));
    close.textContent = text;
    // var widget = editor.addPanel(node, {position: where});
    if(where == 'top'){
        $(node).insertBefore($(editor.getWrapperElement()));
    } else {
        $(node).insertAfter($(editor.getWrapperElement()));
    }
    $(node).data({line:line,visible:"true"});
    CodeMirror.on(node, "click", function() {
        var line = $(this).data("line");
        var cur = editor.getCursor();
        cur.line = line;
        editor.setCursor(cur);
        editor.moveH(-1,'char');
    });
    panels.push(node);
    setEditorSize();
}

function setEditorSize(){
    var pro_nav_wid = $("#project_nav").width();
    $("#page_editor").width(Math.max(window.innerWidth - pro_nav_wid,400));
    var visiblePanels = panels.filter(function(p){
        return $(p).data("visible") == "true";
    })
    var cmHeight = $("#editor_section").outerHeight();// - (50+visiblePanels.length*25)
    if(!$(".CodeMirror").hasClass("CodeMirrorFullscreen")){
        cmHeight -= 50;
    }
    $(".CodeMirror").css("height",cmHeight+"px");
    editor.refresh();
}

function arrowHorNavigation(arrKey){
    var selectedIdx = $("#topMenu > ul > div > li.selected").parent().index();
    if(arrKey == "Left"){
        selectedIdx--;
    } else if(arrKey == "Right"){
        selectedIdx++;
    }
    var maxLI = $("#topMenu > ul > div > li").length - 1;
    if(selectedIdx > maxLI){
        selectedIdx = 0;
    } else if(selectedIdx < 0){
        selectedIdx = maxLI;
    }
    $("#topMenu > ul > div").eq(selectedIdx).find("li").trigger("mouseover");
}

function arrowVertNavigation(arrKey){
    if($("#top_menu_cont > ul li").length > 0){
        if($("#top_menu_cont > ul li.selected").length == 0){
            $("#top_menu_cont > ul li").eq(0).trigger("mouseover");
        } else {
            var maxLI = $("#top_menu_cont > ul li").length - 1;
            var selectedIdx = $("#top_menu_cont > ul li.selected").index();
            if(arrKey == "Up"){
                selectedIdx--;
            } else if(arrKey == "Down"){
                selectedIdx++;
            }
            if(selectedIdx > maxLI){
                selectedIdx = 0;
            } else if(selectedIdx < 0){
                selectedIdx = maxLI;
            }
            $("#top_menu_cont > ul li").eq(selectedIdx).trigger("mouseover");
            if($("#top_menu_cont > ul li").eq(selectedIdx).hasClass("horizontal")){
                arrowVertNavigation(arrKey);
            }
        }
    }
}

function showPreview(){
    html2canvas($(".CodeMirror.CodeMirror-wrap")[0], {
        allowTaint: true,
        taintTest: false,
        onrendered: function(canvas) {
            console.log(canvas);
            $("#preview_can").attr("width",150);
            $("#preview_can").attr("height",innerHeight-49);
            var context = canvas.getContext("2d");
            var imageData = context.getImageData(0,0,canvas.width,canvas.height);
            var can = $("#preview_can")[0];
            var cxt = can.getContext("2d");
            cxt.putImageData(imageData,0,0);
            // var imgSrc = canvas.toDataURL();
            // $("#preview_scroll").attr("src",imgSrc);
        }
    });
}

function saveCursor(){
    if(files_list[currentFileIndex]){
        var curPos = editor.getCursor();
        files_list[currentFileIndex]['cursor'] = curPos['line']+"||"+curPos['ch'];
    }
}

function makeScrollable(that){
    $(that).mCustomScrollbar(scrollOpts);
}

function initScrollers(){
    file_scroll = $("#project_nav > ul").mCustomScrollbar(scrollOpts);
    folder_scroll = $("#project_nav > .directory").mCustomScrollbar(scrollOpts);
    // msg_scroll = $("#chat_messages").mCustomScrollbar(scrollOpts);
    openConnection();
}

function openFiles(){
    showMenu(function(){
        $("#topMenu > ul > div > li:first").click();
        $("#top_menu_cont > ul > li:nth-child(3)").trigger("mouseover");
    });
}


/*   Socket connection methods   */

function openConnection(){
    connection = new WebSocket("ws://localhost:8081");
    connection.onopen = function () {
        console.log("Connection opened");
        connection.send('{"nickname":"'+nickname+'"}');
        loadModesAndShortcuts();
    }
    connection.onclose = function () {
        console.log("Connection closed");
        serverWentOffline();
    }
    connection.onerror = function () {
        console.log("Connection error");
    }
    connection.onmessage = function (event) {
        if(event.data){
            $("#message_text").attr("placeholder","Enter text to send");
            var data = event.data;
            try{
                if(typeof data == 'string'){
                    data = JSON.parse(event.data);
                }
            } catch (err){
                console.log(err);
            }
            if($.isArray(data)){
                if(typeof data[0] == 'string'){
                    usersOnline = data;
                    showUsers();
                } else {
                    console.log(data);
                }
            } else if(data.msg){
                var msg = data.msg;
                msg = unescape(htmlspecialchars_decode(msg));
                var $li = $('<li />',{'style':'opacity:0;'});
                var user = data.name;
                var anc_class = '';
                if(user == nickname){
                    user = 'You'
                    anc_class = 'current'
                }
                $li.append($('<a />',{'title':user,'class':anc_class}).append($('<img />',{src:'images/user.png','Height':'40'})));
                $li.append($('<span />',{'class':anc_class}).text(msg));
                $("#chat_messages").append($li);
                animateAndRemoveAttr($li);
                if(!$("#chat_container").hasClass("open")){
                    startBlinking();
                }
                if(isActive && notificationsEnabled && user != "You"){
                    var not = new Notification("Message from "+user+"\n"+msg);
                    notifications_arr.push(not);
                }
            } else if(data.saved){
                if(data.name != nickname){
                    saveFile('','',function(){
                        console.log("File refreshed");
                    });
                }
            } else if(data.new_guest){
                if(data.new_guest != nickname){
                    userCameOnline(data.new_guest);
                    $("#chat_messages").append($('<i />',{title:currentTime()}).text(data.new_guest+" joined chat!"));
                }
            } else if(data.end_guest){
                userGoneOffline(data.end_guest);
                $("#chat_messages").append($('<i />',{title:currentTime()}).text(data.end_guest+" left chat!"));
            } else if(data.typing){
                if(data.name != nickname){
                    $("#message_text").attr("placeholder",data.name+" is typing..");
                }
            }
            if(data.name){
                if(nickname != data.name && data.file == currentFile.file_name){
                    typingUser = data.name;
                    processMessage(data);
                }
            }
        }
    }
    // var chat_scroll_opts = $.extend({},scrollOpts)
    // chat_scroll_opts.axis = 'x';
    // chat_scroll_opts.autoHideScrollbar = false;
    // chat_scroll_opts.scrollButtons = {enable:true};
    // chat_scroll_opts.theme = 'minimal-dark';
    // console.log(chat_scroll_opts)
    // $("#chat_members").mCustomScrollbar(chat_scroll_opts);
    $("#chat_members").mCustomScrollbar({
        axis:"x",
        theme:"minimal-dark",
        scrollInertia : 300,
        autoExpandScrollbar:true,
        advanced:{autoExpandHorizontalScroll:true}
    });
}



/*    Messages    */

function sendMessage(text){
    text = JSON.stringify(text);
    var cursor = editor.getCursor();
    if(connection && connection.readyState != connection.CLOSED){
        var message = '{"text":'+text+',"cursor":{"line":"'+cursor.line+'","ch":"'+cursor.ch+'"},"name":"'+nickname+'","file":"'+currentFile.file_name+'"}';
        connection.send(message);
    }
}

function processMessage(data){
    if(data.text){
        var text = data.text;
        var sender = data.name;
        if(typeof text == 'string'){
            text = JSON.parse(text);
        }
        if(text.text){
            editor.replaceRange(text.text, text.from, text.to, text.origin);
            var cursor = data.cursor;
            var pos = new CodeMirror.Pos(cursor.line,cursor.ch);
            editor.setCursor(pos);
            $(".CodeMirror-cursor").css("visibility","visible");
            $(".CodeMirror-cursor").css("border-left","1px solid red");
        }
    }
}

function sendTextMessage(){
    var msg = $("#message_text").val();
    msg = escape(htmlspecialchars(msg).replace(/\n/g, '<br />'));
    var text = '{"msg":"'+msg+'","name":"'+nickname+'"}';
    connection.send(text);
    $("#message_text").val('');
}

function showUsers(){
    $("#chat_members .mCSB_container").html('');
    usersOnline.forEach(function(user){
        var user_id = user.replace(' ','_');
        if($('#'+user_id).length == 0)
        $("<li />",{'id':user_id}).text(user).appendTo($("#chat_members .mCSB_container"));
    })
}

function userCameOnline(user){
    var user_id = user.replace(' ','_');
    if($('#'+user_id).length == 0){
        var $li = $("<li />",{'id':user_id,'style':'opacity:0'});
        $li.text(user).appendTo($("#chat_members .mCSB_container"));
        animateAndRemoveAttr($li);
    }
}

function userGoneOffline(user){
    var user_id = user.replace(' ','_');
    $('#'+user_id).animate({opacity:0},1000,function(){
        $(this).remove();
        $("#chat_members").hide().show(100);
    })
}

function serverWentOffline(){
    $("#chat_members li").addClass("offline");
    $("#chat_messages").append($('<i />',{title:currentTime()}).text("Server went offline!"));
}


/*      UI methods      */

function animateAndRemoveAttr(elem){
    elem.animate({'opacity':1},1000,function(){
        $(this).removeAttr("style");
        $("#chat_messages").animate({
            scrollTop : $("#chat_messages")[0].scrollHeight
        },1000);
    });
}

function startBlinking(){
    if(blinkInter){
        stopBlinking();
    }
    blinkInter = setInterval(function(){
        $(".header").toggleClass("new_msg");
    },500);
}
function stopBlinking(){
    clearInterval(blinkInter);
    blinkInter = null;
    $(".header").removeClass("new_msg");
}


/*  Utilities   */

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};
values = function(that){
    var result = [];
    for (var key in that)
        if(typeof that[key] != 'function')
            result.push(that[key]);
    return result;
};
String.prototype.escapeHTML = function(){
    var local_string = this.replace(/>/g,'&gt;');
    local_string = local_string.replace(/</g,'&lt;');
    return local_string;
};
Array.prototype.toObject = function(){
    var temp = {};
    for(var i in this){
        if(typeof this[i] != 'function')
            temp[this[i]] = i;
    }
    return temp;
}

function htmlspecialchars(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function htmlspecialchars_decode(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, '\'');
}

function currentTime(){
    return new Date().toLocaleTimeString();
}

/*   Google Custom Search API    */

function GoogleSearchInit(){
    (function() {
        Log("Creating google instance");
        isGoogleInitialized = true;
        var cx = '016182539101931762327:ajy2nfpitre';
        var gcse = document.createElement('script');
        gcse.type = 'text/javascript';
        gcse.async = true;
        gcse.src = (document.location.protocol == 'https:' ? 'https:' : 'http:') +'//www.google.com/cse/cse.js?cx=' + cx;
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(gcse, s);
        var target = document.querySelector('#google_search');
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if(mutation.previousSibling){
                if(mutation.previousSibling.id == "___gcse_0"){
                    $("input.gsc-input").attr("placeholder","Search in Google");
                    observer.disconnect();
                }
            }
          });    
        });
        var config = { attributes: true, childList: true, characterData: true };
        observer.observe(target, config);
    })();
}
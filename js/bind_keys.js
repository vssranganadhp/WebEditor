(function(){
 if(Mousetrap){
    Mousetrap.bind(["command+k","ctrl+k"],function(e){
        var fm = new FileManager()
        fm.createNew();
        handleEvent(e);
    });
    Mousetrap.bind("command+l",function(e){
        var fm = new FileManager();
        fm.createNewDirectory();
        handleEvent(e);
    });
    Mousetrap.bind("esc",function(e){
        CodeMirror.commands.hidePopups(editor);
    });
    Mousetrap.bind(['command+s', 'ctrl+s'],function(e){
        handleEvent(e);
        editor.save();
    });
    Mousetrap.bind(['command+n', 'ctrl+n'],function(e){
        handleEvent(e);
        Log("clicked N")
    });
    Mousetrap.bind(['command+f', 'ctrl+f'],function(e){
        handleEvent(e);
        CodeMirror.commands.find(editor)
    });
    Mousetrap.bind(['alt+f'],function(e){
        handleEvent(e);
        if(!menuShown){
            showMenu();
        } else {
            hideMenu();
        }
    });
    Mousetrap.bind(['f1', '?'],function(e){
        handleEvent(e);
        $(".help").show();
    });
    Mousetrap.bind(['f2'],function(e){
        handleEvent(e);
        if($(".file.selected").length > 0){
            renameSelectedFile();
        }
    });
    Mousetrap.bind(['command+p'],function(e){
        handleEvent(e);
        CodeMirror.commands.showPreview(editor);
    });
    Mousetrap.bind(['command+alt+['],function(e){
        handleEvent(e);
        var selFileIdx = currentFileIndex;
        if(selFileIdx > 0)
            selFileIdx--;
        else
            selFileIdx = ProjectManager.length-1;
        selectFileAtIndex(selFileIdx);
    });
    Mousetrap.bind(['command+alt+]'],function(e){
        handleEvent(e);
        var selFileIdx = currentFileIndex;
        if(selFileIdx < ProjectManager.length - 1)
            selFileIdx++;
        else
            selFileIdx = 0;
        selectFileAtIndex(selFileIdx);
    });
    Mousetrap.bind(['command+o'],function(e){
        openFiles();
        handleEvent(e);
        return false;
    });
    Mousetrap.bind(['left','right','up','down'],function(e){
        var keyId = e.keyIdentifier;
        if(menuShown){
            switch(keyId){
                case 'Left':
                case 'Right':
                            arrowHorNavigation(keyId);
                            break;
                case 'Down':
                case 'Up':
                            arrowVertNavigation(keyId);
                            break;
                default:
                console.log(keyId);
            }
        }
        handleEvent(e);
    });
 }
})();
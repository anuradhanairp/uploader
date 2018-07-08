/**
 * http://github.com/valums/file-uploader
 * 
 * Multiple file upload component with progress-bar, drag-and-drop. 
 * © 2010 Andrew Valums ( andrew(at)valums.com ) 
 * 
 * Licensed under GNU GPL 2 or later and GNU LGPL 2 or later, see license.txt.
 */    

//
// Helper functions
//

var qq = qq || {};

/**
 * Adds all missing properties from second obj to first obj
 */ 
qq.extend = function(first, second){
    for (var prop in second){
        first[prop] = second[prop];
    }
};  

/**
 * Searches for a given element in the array, returns -1 if it is not present.
 * @param {Number} [from] The index at which to begin the search
 */
qq.indexOf = function(arr, elt, from){
    if (arr.indexOf) return arr.indexOf(elt, from);
    
    from = from || 0;
    var len = arr.length;    
    
    if (from < 0) from += len;  

    for (; from < len; from++){  
        if (from in arr && arr[from] === elt){  
            return from;
        }
    }  
    return -1;  
}; 
    
qq.getUniqueId = (function(){
    var id = 0;
    return function(){ return id++; };
})();

//
// Events

qq.attach = function(element, type, fn){
    if (element.addEventListener){
        element.addEventListener(type, fn, false);
    } else if (element.attachEvent){
        element.attachEvent('on' + type, fn);
    }
};
qq.detach = function(element, type, fn){
    if (element.removeEventListener){
        element.removeEventListener(type, fn, false);
    } else if (element.attachEvent){
        element.detachEvent('on' + type, fn);
    }
};

qq.preventDefault = function(e){
    if (e.preventDefault){
        e.preventDefault();
    } else{
        e.returnValue = false;
    }
};

//
// Node manipulations

/**
 * Insert node a before node b.
 */
qq.insertBefore = function(a, b){
    b.parentNode.insertBefore(a, b);
};
qq.remove = function(element){
    element.parentNode.removeChild(element);
};

qq.contains = function(parent, descendant){       
    // compareposition returns false in this case
    if (parent == descendant) return true;
    
    if (parent.contains){
        return parent.contains(descendant);
    } else {
        return !!(descendant.compareDocumentPosition(parent) & 8);
    }
};

/**
 * Creates and returns element from html string
 * Uses innerHTML to create an element
 */
qq.toElement = (function(){
    var div = document.createElement('div');
    return function(html){
        div.innerHTML = html;
        var element = div.firstChild;
        div.removeChild(element);
        return element;
    };
})();

//
// Node properties and attributes

/**
 * Sets styles for an element.
 * Fixes opacity in IE6-8.
 */
qq.css = function(element, styles){
    if (styles.opacity != null){
        if (typeof element.style.opacity != 'string' && typeof(element.filters) != 'undefined'){
            styles.filter = 'alpha(opacity=' + Math.round(100 * styles.opacity) + ')';
        }
    }
    qq.extend(element.style, styles);
};
qq.hasClass = function(element, name){
    var re = new RegExp('(^| )' + name + '( |$)');
    return re.test(element.className);
};
qq.addClass = function(element, name){
    if (!qq.hasClass(element, name)){
        element.className += ' ' + name;
    }
};
qq.removeClass = function(element, name){
    var re = new RegExp('(^| )' + name + '( |$)');
    element.className = element.className.replace(re, ' ').replace(/^\s+|\s+$/g, "");
};
qq.setText = function(element, text){
    element.innerText = text;
    element.textContent = text;
};

//
// Selecting elements

qq.children = function(element){
    var children = [],
    child = element.firstChild;

    while (child){
        if (child.nodeType == 1){
            children.push(child);
        }
        child = child.nextSibling;
    }

    return children;
};

qq.getByClass = function(element, className){
    if (element.querySelectorAll){
        return element.querySelectorAll('.' + className);
    }

    var result = [];
    var candidates = element.getElementsByTagName("*");
    var len = candidates.length;

    for (var i = 0; i < len; i++){
        if (qq.hasClass(candidates[i], className)){
            result.push(candidates[i]);
        }
    }
    return result;
};

/**
 * obj2url() takes a json-object as argument and generates
 * a querystring. pretty much like jQuery.param()
 * 
 * how to use:
 *
 *    `qq.obj2url({a:'b',c:'d'},'http://any.url/upload?otherParam=value');`
 *
 * will result in:
 *
 *    `http://any.url/upload?otherParam=value&a=b&c=d`
 *
 * @param  Object JSON-Object
 * @param  String current querystring-part
 * @return String encoded querystring
 */
qq.obj2url = function(obj, temp, prefixDone){
    var uristrings = [],
        prefix = '&',
        add = function(nextObj, i){
            var nextTemp = temp 
                ? (/\[\]$/.test(temp)) // prevent double-encoding
                   ? temp
                   : temp+'['+i+']'
                : i;
            if ((nextTemp != 'undefined') && (i != 'undefined')) {  
                uristrings.push(
                    (typeof nextObj === 'object') 
                        ? qq.obj2url(nextObj, nextTemp, true)
                        : (Object.prototype.toString.call(nextObj) === '[object Function]')
                            ? encodeURIComponent(nextTemp) + '=' + encodeURIComponent(nextObj())
                            : encodeURIComponent(nextTemp) + '=' + encodeURIComponent(nextObj)                                                          
                );
            }
        }; 

    if (!prefixDone && temp) {
      prefix = (/\?/.test(temp)) ? (/\?$/.test(temp)) ? '' : '&' : '?';
      uristrings.push(temp);
      uristrings.push(qq.obj2url(obj));
    } else if ((Object.prototype.toString.call(obj) === '[object Array]') && (typeof obj != 'undefined') ) {
        // we wont use a for-in-loop on an array (performance)
        for (var i = 0, len = obj.length; i < len; ++i){
            add(obj[i], i);
        }
    } else if ((typeof obj != 'undefined') && (obj !== null) && (typeof obj === "object")){
        // for anything else but a scalar, we will use for-in-loop
        for (var i in obj){
            add(obj[i], i);
        }
    } else {
        uristrings.push(encodeURIComponent(temp) + '=' + encodeURIComponent(obj));
    }

    return uristrings.join(prefix)
                     .replace(/^&/, '')
                     .replace(/%20/g, '+'); 
};

//
//
// Uploader Classes
//
//

var qq = qq || {};
    
/**
 * Creates upload button, validates upload, but doesn't create file list or dd. 
 */
qq.FileUploaderBasic = function(o){
    this._options = {
        // set to true to see the server response
        debug: false,
        action: '/server/upload',
        params: {},
        button: null,
        multiple: true,
        maxConnections: 3,
        // validation        
        allowedExtensions: [],               
        sizeLimit: 104857600,   
        minSizeLimit: 0,  
        listElement: null,

        template:'<div class="qq-uploader slide-uploader">' + 
                '<div class="qq-upload-drop-area slide-drop-area"><span></span></div>' +
                '<div class="qq-upload-button slide-clip-button">Clip</div>' +
                '<ul class="qq-upload-list-clip slide-list"></ul>' + 
             '</div>',

        imageTemplate:'<div class="qq-uploader slide-uploader">' + 
                '<div class="qq-upload-drop-area slide-drop-area"><span></span></div>' +
                '<div class="qq-upload-button slide-clip-button">Image</div>' +
                '<ul class="qq-upload-list-clip slide-list"></ul>' + 
             '</div>',

        ieUploadTemplate:'<div class="qq-uploader slide-uploader">' + 
                '<div class="qq-upload-drop-area slide-drop-area"><span></span></div>' +
                '<div class="qq-upload-button slide-clip-button">Select from Folder</div>' +
                '<ul class="qq-upload-list-clip slide-list"></ul>' + 
             '</div>',             

        fileTemplate: '<li>' +
                '<span class="qq-upload-file"></span>' +
                '<span class="qq-upload-spinner"></span>' +
                '<span class="qq-upload-size"></span>' +
                '<a class="qq-upload-cancel" href="#">Cancel</a>' +
                '<span class="qq-upload-failed-text">Failed</span>' +
            '</li>',

        // audioTemplate: '<div class="qq-uploader">' + 
        //         '<div class="qq-upload-drop-area"><span></span></div>' +
        //         '<div class="qq-upload-button">Audio</div>' +
        //         '<ul class="qq-upload-list-clip" style="display:none;"></ul>' + 
        //      '</div>',

        audioTemplate:'<div class="qq-uploader">' + 
                '<div class="qq-audio-drop-area slide-drop-area"><span></span></div>' +
                '<div class="qq-upload-button slide-clip-button">Audio from Folder</div>' +
                '<ul class="qq-upload-list-clip slide-list"></ul>' + 
             '</div>',

        newTemplate: '<div class="grid_4 grid_4_box2 uploading basic_uploader">'+
                    '<div class="brd-grid_4_box2 dropped">'+
                        '<input type="hidden" name="files" class="file_id" />'+
                        '<div class="title-create"><span class="qq-upload-file"></span>'+
                            '<a class="drop-options" href="#" >'+
                                '<img src="/site_media/images/icon-side.jpg" alt=""  style="float:right; margin:12px 0 0 0;" />'+
                            '</a>'+
                            '<ul class="movie-options" style="display:none;position: absolute;background-color:white;">'+
                                '<li class="add">Add Caption</li>'+
                                '<li class="tag">Tag People</li>'+
                                '<li class="trim">Trim Clip</li>'+
                                '<li class="remove"><a href="#" class="remove_clip">Remove</a></li>'+
                            '</ul>'+
                        '</div>'+
                        '<div class="video"><input type="hidden" class="task_id" /><span class="qq-upload-size"></span><div id="clip-upload-progress"><div class="progress-bar"></div></div><a class="qq-upload-cancel" href="#">Cancel</a></div>'+
                        '<div class="size"></div>'+
                    '</div>'+
                '</div>' ,

        ieTemplate: '<div class="grid_4 grid_4_box2 uploading">'+
                    '<div class="brd-grid_4_box2 dropped">'+
                        '<input type="hidden" name="files" class="file_id" />'+
                        '<div class="title-create"><span class="qq-upload-file"></span>'+
                            '<a class="drop-options" href="#" >'+
                                '<img src="/site_media/images/icon-side.jpg" alt=""  style="float:right; margin:12px 0 0 0;" />'+
                            '</a>'+
                            '<ul class="movie-options" style="display:none;position: absolute;background-color:white;">'+
                                '<li class="add">Add Caption</li>'+
                                '<li class="tag">Tag People</li>'+
                                '<li class="trim">Trim Clip</li>'+
                                '<li class="remove"><a href="#" class="remove_clip">Remove</a></li>'+
                            '</ul>'+
                        '</div>'+
                        '<div class="video"><input type="hidden" class="task_id" /><span class="qq-upload-size"></span><img class="loading" src="/site_media/images/ajax-loader.gif" /></div>'+
                        '<div class="size"></div>'+
                    '</div>'+
                '</div>' ,

        ieaudioTemplate: '<div class="grid_4 grid_4_box2 uploading" id="drag-drop-audio">'+
                        '<div class="blue-brd-grid_4_box2">'+
                            '<div class="draging"><img id="audio_progress" class="loading" src="/site_media/images/ajax-loader.gif" /><input type="hidden" class="audio_url" name="audio" /><input type="hidden" class="task_id" /><div id="audio-player"></div></div>'+
                            '<div class="change">Change Soundtrack<img src="/site_media/images/down-arrow.jpg" alt="" style="margin:0 0 0 50px;" /></div>'+
                        '</div>'+
                    '</div>',

        classes: {
            // used to get elements from templates
            button: 'qq-upload-button',
            list: 'qq-upload-list-clip',
                        
            file: 'qq-upload-file',
            spinner: 'qq-upload-spinner',
            size: 'qq-upload-size',
            cancel: 'qq-upload-cancel',

            // added to list item when upload completes
            // used in css to hide progress spinner
            success: 'qq-upload-success',
            fail: 'qq-upload-fail',
            hide: 'qq-upload-hide',

            file: 'qq-upload-file',
            spinner: 'qq-upload-spinner',
            size: 'qq-upload-size',
            totalsize: 'size',
            progressbar: 'progress-bar',

            task_id: 'task_id',
            video: 'video',
            file_id: 'file_id',
            remove_clip: 'remove_clip',
            dropped: 'dropped',
            drop_options: "drop-options",
        },                         
        // events
        // return false to cancel submit
        onSubmit: function(id, fileName){},
        onProgress: function(id, fileName, loaded, total){},
        onComplete: function(id, fileName, responseJSON){},
        onCancel: function(id, fileName){},
        // messages                
        messages: {
            typeError: "{file} has invalid extension. Only {extensions} are allowed.",
            sizeError: "{file} is too large, maximum file size is {sizeLimit}.",
            minSizeError: "{file} is too small, minimum file size is {minSizeLimit}.",
            emptyError: "{file} is empty, please select files again without it.",
            onLeave: "The files are being uploaded, if you leave now the upload will be cancelled."            
        },
        showMessage: function(message){
            alert(message);
        }               
    };
    qq.extend(this._options, o);

    this._element = this._options.element;

    if ($(this._element).attr('id') == 'upload-clip') {
        this._element.innerHTML = this._options.template;
        this._button = this._createUploadButton(this._find(this._element, 'button'));
        this._listElement = this._options.listElement || this._find(this._element, 'list');
        // this._classes = this._options.audioclasses;
    } else if ($(this._element).attr('id') == 'upload-image'){
        this._element.innerHTML = this._options.imageTemplate;
        this._button = this._createUploadButton(this._find(this._element, 'button'));
        this._listElement = this._options.listElement || this._find(this._element, 'list');
    } else if ($(this._element).attr('id') == 'upload_msie'){
        this._element.innerHTML = this._options.ieUploadTemplate;
        this._button = this._createUploadButton(this._find(this._element, 'button'));
        this._listElement = this._options.listElement || this._find(this._element, 'list');
    } else if ($(this._element).attr('id') == 'audioupload_msie'){
        this._element.innerHTML = this._options.audioTemplate;
        this._button = this._createUploadButton(this._find(this._element, 'button'));
        this._listElement = this._options.listElement || this._find(this._element, 'list');
    }
        
    // number of files being uploaded
    this._filesInProgress = 0;
    this._handler = this._createUploadHandler(); 

    // this._button = this._createUploadButton(this._find(this._element, 'button'));
    
    if (this._options.button){ 
        this._button = this._createUploadButton(this._options.button);
    }
                        
    this._preventLeaveInProgress();         
};
   
qq.FileUploaderBasic.prototype = {
    _find: function(parent, type){ 
        var element = qq.getByClass(parent, this._options.classes[type])[0];
        if (!element){
            throw new Error('element not found ' + type);
        }
        
        return element;
    },
    setParams: function(params){
        this._options.params = params;
    },
    getInProgress: function(){
        return this._filesInProgress;         
    },
    _createUploadButton: function(element){
        var self = this;
        
        return new qq.UploadButton({
            element: element,
            multiple: this._options.multiple && qq.UploadHandlerXhr.isSupported(),
            onChange: function(input){
                self._onInputChange(input);
            }        
        });           
    },    
    _createUploadHandler: function(){
        var self = this,
            handlerClass;        
        
        if(qq.UploadHandlerXhr.isSupported()){           
            handlerClass = 'UploadHandlerXhr';                        
        } else {
            handlerClass = 'UploadHandlerForm';
        }
        console.log("creating upload handler");
        console.log(handlerClass);

        var handler = new qq[handlerClass]({
            debug: this._options.debug,
            action: this._options.action,         
            maxConnections: this._options.maxConnections,   
            onProgress: function(id, fileName, loaded, total){ 
                console.log("upload on progress");
                self._onProgress(id, fileName, loaded, total);
                self._options.onProgress(id, fileName, loaded, total);                    
            },            
            onComplete: function(id, fileName, result){
                console.log("upload is complete");
                self._onComplete(id, fileName, result);
                self._options.onComplete(id, fileName, result);
            },
            onCancel: function(id, fileName){
                self._onCancel(id, fileName);
                self._options.onCancel(id, fileName);
            }
        });

        return handler;
    },    
    _preventLeaveInProgress: function(){
        var self = this;
        
        qq.attach(window, 'beforeunload', function(e){
            if (!self._filesInProgress){return;}
            
            var e = e || window.event;
            // for ie, ff
            e.returnValue = self._options.messages.onLeave;
            // for webkit
            return self._options.messages.onLeave;             
        });        
    },    
    _onSubmit: function(id, fileName){
        this._filesInProgress++; 
        // console.log("id....");
        // console.log(id);
        if ($(this._element).attr('id') == 'upload-clip' || $(this._element).attr('id') == 'upload-image' || $(this._element).attr('id') == 'upload_msie') {
            this._createDiv(id, fileName);
            this._addToList(id, fileName);
        } else if ($(this._element).attr('id') == 'audioupload_msie') {
            this._createAudioDiv(id, fileName);
        }
        var slide = $("#add-slide");
        $(slide).removeAttr('id');
        // $(slide).find($('#upload-clip')).remove();
        $(slide).css('display', 'none');
        // console.log($(this._element).attr('id'));
        // console.log()
    },
    _onProgress: function(id, fileName, loaded, total){  
        // console.log("progressing...");
        if ($(this._element).attr('id') == 'upload-clip' || $(this._element).attr('id') == 'upload-image' || $(this._element).attr('id') == 'upload_msie') {
            var item = this._getItemByFileId(id);
            // console.log("asdasdasdasdsadsa");
            // console.log(item);
            var slide_count = $('.slide-container').index($(item).parent().parent().parent().parent().parent()) + 1
            var new_id = id + slide_count * 1000;
            // console.log("new id...");
            // console.log(new_id);
            // qq.addClass(item, this._classes.hide);
            // var uploadeddiv = this._getDivByFileId(id);
            var size = this._find(item, 'size');

            var text; 
            var progress;

        
            var uploadeddiv = this._getDivByFileId(new_id);
            var uploadsize = this._find(uploadeddiv, 'size');
            var totalsize = this._find(uploadeddiv, 'totalsize');
            uploadsize.style.display = 'inline';
            var bar = this._find(uploadeddiv, 'progressbar');
            // console.log("total...");
            // console.log(total);
            
            if (loaded != total){
                // text = Math.round(loaded / total * 100) + '% from ' + this._formatSize(total);
                progress = Math.round(loaded / total * 100);
                $(bar).css('width', progress+"%");

            } else {                                   
                // text = this._formatSize(total);
                $(bar).css('width', "100%");
            }          
            
            // qq.setText(size, text); 
            // console.log("progress complete");
            // qq.setText(uploadsize, text); 
            qq.setText(totalsize, this._formatSize(total))  
        }
    },
    _onComplete: function(id, fileName, result){
        this._filesInProgress--;                 
        if (result.error){
            this._options.showMessage(result.error);
        }

        var calldiv = $(this._element);

        if ($(this._element).attr('id') == 'upload-clip' || $(this._element).attr('id') == 'upload-image' || $(this._element).attr('id') == 'upload_msie' || $(this._element).attr('id') == 'audioupload_msie') {

            var item = this._getItemByFileId(id); 
            var slide_count = $('.slide-container').index($(item).parent().parent().parent().parent().parent()) + 1
            var new_id = id + slide_count * 1000;
            // console.log(new_id);
            var calldiv = $(this._element);
            // console.log("complete initialization");
            if ($(this._element).attr('id') == 'audioupload_msie') {
                //Do nothing
            } else {
                qq.remove(this._find(item, 'cancel'));
            }
            console.log("complete initialization");
            if ($(this._element).attr('id') == 'upload-clip' || $(this._element).attr('id') == 'upload-image' || $(this._element).attr('id') == 'upload_msie') {
                var uploadeddiv = this._getDivByFileId(new_id);
                var input =   this._find(uploadeddiv, 'task_id');
                var filename = fileName.replace(/ /g, "_");
                var video =   this._find(uploadeddiv, 'video');
                var file_id = this._find(uploadeddiv, 'file_id');
                var remove_clip = this._find(uploadeddiv, 'remove_clip');
                var dropped = this._find(uploadeddiv, 'dropped');
                var drop_options = this._find(uploadeddiv, 'drop_options');
                $(uploadeddiv).removeClass('uploading');
            } else if ($(this._element).attr('id') == 'audioupload_msie') {
                var audiodiv = $("#drag-drop-audio");
                var input = this._find(audiodiv[0], 'task_id');
                var audio_url = $('.audio_url')[0];
                $(audiodiv).removeClass('uploading');
            }
            if (result.success){
                // qq.addClass(item, this._classes.success);
                // qq.addClass(item, this._classes.hide);
                // qq.addClass(uploadeddiv, this._classes.success); 
                $(input).val(result.task_id);
                $.ajax({
                    url: "/task_status/",
                    data: { task: $(input).val()},
                }).done(function(data) { 
                    console.log(data);
                    console.log($(calldiv).attr('id'));
                    if ($(calldiv).attr('id') == 'upload-clip' || $(calldiv).attr('id') == 'upload-image' || $(calldiv).attr('id') == 'upload_msie') {
                        var obj = $.parseJSON(data);
                        var thumbnail = obj.thumbnail;
                        var thumb_tag = '<img src="'+thumbnail+'" >'
                        $(video).empty();
                        $(video).append(thumb_tag);
                        $(file_id).val(obj.id);
                        var slide = $("#add-slide");
                        $(slide).remove();
                        $(drop_options).click(function() {
                            if ($(this).parent().find("ul.movie-options").css('display') == 'none'){
                                $(this).parent().find("ul.movie-options").show();
                                $(this).parent().find("span").css('color','#2292C0');
                            }
                            else {
                                $(this).parent().find("ul.movie-options").hide();
                                $(this).parent().find("span").css('color','#666666');
                            }
                            return false;
                        });
                        $(remove_clip).click(function () {
                            $.ajax({
                                url: "/clip/"+obj.id+"/remove/",
                            }).done(function(d) { 
                                // console.log(d);
                                $(dropped).parent().remove();
                            });
                            return false;
                        });
                        $.ajax({
                            url: "/check_total_size/",
                        }).done(function(data) {
                            // console.log(data);
                            if (parseInt(data) >= 100) {
                                alert("Clips too big... Try desktop software...");
                                $("#window-alert").css('display', 'block');
                            }
                        });
                    } else if ($(calldiv).attr('id') == 'audioupload_msie') {
                        console.log("audio...")
                        var obj = $.parseJSON(data);
                        $(audio_url).val(obj.relative_url);
                        $("#audio_progress").remove();
                        jwplayer('audio-player').setup({
                            'flashplayer': '/site_media/images/player.swf',
                            'id': 'playerID',
                            'width': '218',
                            'height': '160',
                            'file': obj.url,
                            'image': '/site_media/images/music.jpg',
                            // 'controlbar': 'none'
                        });
                    }
                    // }
                });
            } else {
                // qq.addClass(item, this._classes.fail);
                // qq.addClass(uploadeddiv, this._classes.fail);
            } 
        } else {
            console.log("error");
        }            
    },
    _onCancel: function(id, fileName){
        this._filesInProgress--;        
    },
    _onInputChange: function(input){
        if (this._handler instanceof qq.UploadHandlerXhr){                
            this._uploadFileList(input.files);                   
        } else {             
            if (this._validateFile(input)){                
                this._uploadFile(input);                                    
            }                      
        }               
        this._button.reset();   
    },  
    _uploadFileList: function(files){
        for (var i=0; i<files.length; i++){
            if ( !this._validateFile(files[i])){
                return;
            }            
        }
        
        for (var i=0; i<files.length; i++){
            this._uploadFile(files[i]);        
        }        
    },       
    _uploadFile: function(fileContainer){      
        var id = this._handler.add(fileContainer);
        var fileName = this._handler.getName(id);
        
        if (this._options.onSubmit(id, fileName) !== false){
            this._onSubmit(id, fileName);
            this._handler.upload(id, this._options.params);
        }
    },      
    _validateFile: function(file){
        var name, size;
        
        if (file.value){
            // it is a file input            
            // get input value and remove path to normalize
            name = file.value.replace(/.*(\/|\\)/, "");
        } else {
            // fix missing properties in Safari
            name = file.fileName != null ? file.fileName : file.name;
            size = file.fileSize != null ? file.fileSize : file.size;
        }
                    
        if (! this._isAllowedExtension(name)){            
            this._error('typeError', name);
            return false;
            
        } else if (size === 0){            
            this._error('emptyError', name);
            return false;
                                                     
        } else if (size && this._options.sizeLimit && size > this._options.sizeLimit){            
            this._error('sizeError', name);
            $("#window-alert").css('display', 'block');
            return false;
                        
        } else if (size && size < this._options.minSizeLimit){
            this._error('minSizeError', name);
            return false;            
        }
        
        return true;                
    },
    _error: function(code, fileName){
        var message = this._options.messages[code];        
        function r(name, replacement){ message = message.replace(name, replacement); }
        
        r('{file}', this._formatFileName(fileName));        
        r('{extensions}', this._options.allowedExtensions.join(', '));
        r('{sizeLimit}', this._formatSize(this._options.sizeLimit));
        r('{minSizeLimit}', this._formatSize(this._options.minSizeLimit));
        
        this._options.showMessage(message);                
    },
    _formatFileName: function(name){
        if (name.length > 28){
            // name = name.slice(0, 19) + '...' + name.slice(-13);    
            name = name.slice(0, 27);
        }
        return name;
    },
    _isAllowedExtension: function(fileName){
        var ext = (-1 !== fileName.indexOf('.')) ? fileName.replace(/.*[.]/, '').toLowerCase() : '';
        var allowed = this._options.allowedExtensions;
        
        if (!allowed.length){return true;}        
        
        for (var i=0; i<allowed.length; i++){
            if (allowed[i].toLowerCase() == ext){ return true;}    
        }
        
        return false;
    },    
    _formatSize: function(bytes){
        var i = -1;                                    
        do {
            bytes = bytes / 1024;
            i++;  
        } while (bytes > 99);
        
        return Math.max(bytes, 0.1).toFixed(1) + ['kB', 'MB', 'GB', 'TB', 'PB', 'EB'][i];          
    },

    _createDiv: function(id, fileName){
        if ($.browser.msie) {
            var item = qq.toElement(this._options.ieTemplate);
        } else {
            var item = qq.toElement(this._options.newTemplate);
        }
        // if ($(this._element).attr('id') == 'upload_msie'){
        //     var item = qq.toElement(this._options.ieTemplate);
        // } else {
        //     var item = qq.toElement(this._options.newTemplate);
        // }
        var slide_count = $('.add-slide').length
        item.qqFileId = id + slide_count * 1000;
        // console.log(item.qqFileId);
        // var drag = $("#drag-drop");
        var fileElement = this._find(item, 'file');
        qq.setText(fileElement, this._formatFileName(fileName));
        this._find(item, 'size').style.display = 'none';
        // $(item).insertAfter(drag[0]);
        $("#sortable-clips").append(item);
    },

    _createAudioDiv: function(id, fileName) {
        var item = qq.toElement(this._options.ieaudioTemplate);
        var drag_audio = $("#drag-drop-audio");
        $("#drag-drop-audio").replaceWith($(item));
    },

    _getDivByFileId: function(id){
        var item = $("#sortable-clips > div:nth-child(1)"); 
        
        // there can't be txt nodes in dynamically created list
        // and we can  use nextSibling
        item = item[0];
        while (item){            
            if (item.qqFileId == id) return item;            
            item = item.nextElementSibling;
        }          
    },

    _getItemByFileId: function(id){
        var item = this._listElement.firstChild;  
        // console.log(item);  
        // console.log(item.qqFileId);
        // console.log(id);
        
        // there can't be txt nodes in dynamically created list
        // and we can  use nextSibling
        while (item){            
            if (item.qqFileId == id) return item;            
            item = item.nextSibling;
        }          
    },

    _addToList: function(id, fileName){
        var item = qq.toElement(this._options.fileTemplate);                
        item.qqFileId = id;

        var fileElement = this._find(item, 'file');        
        qq.setText(fileElement, this._formatFileName(fileName));
        this._find(item, 'size').style.display = 'none';        

        this._listElement.appendChild(item);
        item.style.display = 'none';
    },
};
    
       
/**
 * Class that creates upload widget with drag-and-drop and file list
 * @inherits qq.FileUploaderBasic
 */
qq.FileUploader = function(o){
    // call parent constructor
    qq.FileUploaderBasic.apply(this, arguments);
    
    // additional options    
    qq.extend(this._options, {
        element: null,
        // if set, will be used instead of qq-upload-list in template
        listElement: null,
                
        template: '<div class="qq-uploader">' + 
                '<div class="qq-upload-drop-area"><span></span></div>' +
                '<div class="qq-upload-button"><label style="color: grey">or </label><b style="color: #BC000E;">select from a folder</b></div>' +
                '<ul class="qq-upload-list"></ul>' + 
             '</div>',

        // template for one item in file list

        audiotemplate: '<div class="qq-uploader">' + 
                '<div class="qq-audio-upload-drop-area""><span></span></div>' +
                '<div class="qq-upload-button" style="display:none;"></div>' +
                '<ul class="qq-upload-list" style="display:none;"></ul>' + 
             '</div>',

        fileTemplate: '<li>' +
                '<span class="qq-upload-file"></span>' +
                '<span class="qq-upload-spinner"></span>' +
                '<span class="qq-upload-size"></span>' +
                '<a class="qq-upload-cancel" href="#">Cancel</a>' +
                '<span class="qq-upload-failed-text">Failed</span>' +
            '</li>',  
        newTemplate: '<div class="grid_4 grid_4_box2 uploading">'+
                    '<div class="brd-grid_4_box2 dropped">'+
                        '<input type="hidden" name="files" class="file_id" />'+
                        '<div class="title-create"><span class="qq-upload-file"></span>'+
                            '<a class="drop-options" href="#" >'+
                                '<img src="/site_media/images/icon-side.jpg" alt=""  style="float:right; margin:12px 0 0 0;" />'+
                            '</a>'+
                            '<ul class="movie-options" style="display:none;position: absolute;background-color:white;">'+
                                '<li class="add">Add Caption</li>'+
                                '<li class="tag">Tag People</li>'+
                                '<li class="trim">Trim Clip</li>'+
                                '<li class="remove"><a href="#" class="remove_clip">Remove</a></li>'+
                            '</ul>'+
                        '</div>'+
                        '<div class="video"><input type="hidden" class="task_id" /><span class="qq-upload-size"></span><div id="upload-progress"><div class="progress-bar"></div></div><a class="qq-upload-cancel" href="#">Cancel</a></div>'+
                        '<div class="size"></div>'+
                    '</div>'+
                '</div>' ,

        audionewTemplate: '<div class="grid_4 grid_4_box2 uploading" id="drag-drop-audio">'+
                        '<div class="blue-brd-grid_4_box2">'+
                            '<div class="draging"><div id="audio-progress"><div class="audio-progress-bar"></div></div><input type="hidden" class="audio_url" name="audio" /><input type="hidden" class="task_id" /><div id="audio-player"></div></div>'+
                            '<div class="change">Change Soundtrack<img src="/site_media/images/down-arrow.jpg" alt="" style="margin:0 0 0 50px;" /></div>'+
                        '</div>'+
                    '</div>',
        
        classes: {
            // used to get elements from templates
            button: 'qq-upload-button',
            drop: 'qq-upload-drop-area',
            dropActive: 'qq-upload-drop-area-active',
            list: 'qq-upload-list',
            dragdrop: 'drag-drop',
                        
            file: 'qq-upload-file',
            spinner: 'qq-upload-spinner',
            size: 'qq-upload-size',
            cancel: 'qq-upload-cancel',
            progressbar: 'progress-bar',

            // added to list item when upload completes
            // used in css to hide progress spinner
            success: 'qq-upload-success',
            fail: 'qq-upload-fail',
            hide: 'qq-upload-hide',
            totalsize: 'size',
            task_id: 'task_id',
            video: 'video',
            file_id: 'file_id',
            remove_clip: 'remove_clip',
            dropped: 'dropped',
            drop_options: "drop-options",

            audiodrop: 'qq-audio-upload-drop-area',
            audiodropActive: 'qq-audio-upload-drop-area-active',
            audio_url: 'audio_url',
            audio_progrss_bar: 'audio-progress-bar',
        },
    });
    // overwrite options with user supplied    
    qq.extend(this._options, o);       

    this._element = this._options.element;
    // console.log($(this._element).attr('id'));
    if ($(this._element).attr('id') == 'audio-uploader') {
        this._element.innerHTML = this._options.audiotemplate;
        // this._classes = this._options.audioclasses;
    } else {
        this._element.innerHTML = this._options.template;  
        // this._classes = this._options.classes;      
    }
    this._listElement = this._options.listElement || this._find(this._element, 'list');
    this._uploadlist = $("#sortable-clips")[0];
    this._dragdiv = $('#dragdrop');
    
    this._classes = this._options.classes;
        
    this._button = this._createUploadButton(this._find(this._element, 'button'));        
    
    this._bindCancelEvent();
    this._setupDragDrop();
};

// inherit from Basic Uploader
qq.extend(qq.FileUploader.prototype, qq.FileUploaderBasic.prototype);

qq.extend(qq.FileUploader.prototype, {
    /**
     * Gets one of the elements listed in this._options.classes
     **/
    _find: function(parent, type){ 
        var element = qq.getByClass(parent, this._options.classes[type])[0];
        if (!element){
            throw new Error('element not found ' + type);
        }
        
        return element;
    },
    _setupDragDrop: function(){
        if ($(this._element).attr('id') == 'audio-uploader') {
            var self = this,
                dropArea = this._find(this._element, 'audiodrop');   
        } else {
            var self = this,
                dropArea = this._find(this._element, 'drop');
        }                     

        var dz = new qq.UploadDropZone({
            element: dropArea,
            onEnter: function(e){
                // console.log($(dropArea).attr('class'));
                // console.log(dropArea);
                if ($(dropArea).hasClass(self._classes.audiodrop)) {
                    // console.log("audio enter...");
                    qq.addClass(dropArea, self._classes.audiodropActive);
                } else {
                    qq.addClass(dropArea, self._classes.dropActive);
                }
                e.stopPropagation();
            },
            onLeave: function(e){
                e.stopPropagation();
            },
            onLeaveNotDescendants: function(e){
                if ($(dropArea).hasClass(self._classes.audiodrop)) {
                        qq.removeClass(dropArea, self._classes.audiodropActive); 
                    } else {
                        qq.removeClass(dropArea, self._classes.dropActive); 
                    } 
            },
            onDrop: function(e){
                //dropArea.style.display = 'none';
                if ($(dropArea).hasClass(self._classes.audiodrop)) {
                    qq.removeClass(dropArea, self._classes.audiodropActive);
                } else {
                    qq.removeClass(dropArea, self._classes.dropActive);
                }
                self._uploadFileList(e.dataTransfer.files);    
            }
        });
                
        //dropArea.style.display = 'block';

        qq.attach(document, 'dragenter', function(e){     
            if (!dz._isValidFileDrag(e)) return; 
            
            dropArea.style.display = 'block';            
        });                 
        qq.attach(document, 'dragleave', function(e){
            if (!dz._isValidFileDrag(e)) return;            
            
            var relatedTarget = document.elementFromPoint(e.clientX, e.clientY);
            // only fire when leaving document out
            if ( ! relatedTarget || relatedTarget.nodeName == "HTML"){               
               // dropArea.style.display = 'none';                                            
            }
        });                
    },
    _onSubmit: function(id, fileName){
        qq.FileUploaderBasic.prototype._onSubmit.apply(this, arguments); 
        // console.log("id...");
        // console.log(id);
        if ($(this._element).attr('id') == 'file-uploader') {
            this._createDiv(id, fileName); 
        } else {
            this._createAudioDiv(id, fileName); 
        }
        this._addToList(id, fileName);
    },
    _onProgress: function(id, fileName, loaded, total){
        qq.FileUploaderBasic.prototype._onProgress.apply(this, arguments);

        // console.log("progress");
        // console.log(this._element);
        var item = this._getItemByFileId(id);
        qq.addClass(item, this._classes.hide);
        // var uploadeddiv = this._getDivByFileId(id);
        var size = this._find(item, 'size');
        // var uploadsize = this._find(uploadeddiv, 'size');
        // var totalsize = this._find(uploadeddiv, 'totalsize');
        // size.style.display = 'inline';
        // uploadsize.style.display = 'inline';
        // console.log("progress initialization");

        var text; 
        var progress;

        if ($(this._element).attr('id') == 'file-uploader') {
            var uploadeddiv = this._getDivByFileId(id);
            var uploadsize = this._find(uploadeddiv, 'size');
            var totalsize = this._find(uploadeddiv, 'totalsize');
            uploadsize.style.display = 'inline';
            var bar = this._find(uploadeddiv, 'progressbar');
        } else {
            var bar = $(".audio-progress-bar");
        }
        // console.log("div changed...");
        
        if (loaded != total){
            // text = Math.round(loaded / total * 100) + '% from ' + this._formatSize(total);
            progress = Math.round(loaded / total * 100);
            $(bar).css('width', progress+"%");

        } else {                                   
            // text = this._formatSize(total);
            $(bar).css('width', "100%");
        }          
        
        // qq.setText(size, text); 
        // console.log("progress complete");
        // qq.setText(uploadsize, text); 
        if ($(this._element).attr('id') == 'file-uploader') {
            qq.setText(totalsize, this._formatSize(total))       
        }
    },
    _onComplete: function(id, fileName, result){
        qq.FileUploaderBasic.prototype._onComplete.apply(this, arguments);

        // mark completed
        var item = this._getItemByFileId(id); 
        var calldiv = $(this._element);
        // var uploadeddiv = this._getDivByFileId(id); 
        // var input =   this._find(uploadeddiv, 'task_id');
        // var thumbnail = 'https://s3.amazonaws.com/sparkupload1/thumbnail/' + fileName + '.png'; 
        // var thumb_tag = '<img src="'+thumbnail+'" >'
        // var video =   this._find(uploadeddiv, 'video');
        // var file_id = this._find(uploadeddiv, 'file_id');
        // var remove_clip = this._find(uploadeddiv, 'remove_clip');
        // var dropped = this._find(uploadeddiv, 'dropped');
        // var drop_options = this._find(uploadeddiv, 'drop_options');
        // console.log("complete initialization");
        qq.remove(this._find(item, 'cancel'));
        // qq.remove(this._find(item, 'spinner'));
        // qq.remove(this._find(uploadeddiv, 'cancel'));
        // qq.remove(this._find(uploadeddiv, 'spinner'));
        if ($(this._element).attr('id') == 'file-uploader') {
            var uploadeddiv = this._getDivByFileId(id);
            var input =   this._find(uploadeddiv, 'task_id');
            var filename = fileName.replace(/ /g, "_");
            var video =   this._find(uploadeddiv, 'video');
            var file_id = this._find(uploadeddiv, 'file_id');
            var remove_clip = this._find(uploadeddiv, 'remove_clip');
            var dropped = this._find(uploadeddiv, 'dropped');
            var drop_options = this._find(uploadeddiv, 'drop_options');
            $(uploadeddiv).removeClass('uploading');
        } else {
            var audiodiv = $("#drag-drop-audio");
            var input = this._find(audiodiv[0], 'task_id');
            var audio_url = $('.audio_url')[0];
            // console.log(audio_url);
            // console.log("complete audio upload");
            $(audiodiv).removeClass('uploading');
            // jwplayer('audio-player').setup({
            //     'flashplayer': '/site_media/images/player.swf',
            //     'id': 'playerID',
            //     'width': '218',
            //     'height': '160',
            //     'file': '/site_media/Angreji-Beat-Cocktail.mp3',
            //     'image': '/site_media/tm.jpg',
            //     // 'controlbar': 'none'
            // });

        }
        
        if (result.success){
            // qq.addClass(item, this._classes.success);
            // qq.addClass(item, this._classes.hide);
            // qq.addClass(uploadeddiv, this._classes.success); 
            $(input).val(result.task_id);
            $.ajax({
                url: "/task_status/",
                data: { task: $(input).val()},
            }).done(function(data) { 
                // console.log(data);
                if ($(calldiv).attr('id') == 'file-uploader') {
                    var obj = $.parseJSON(data);
                    var thumbnail = obj.thumbnail;
                    var thumb_tag = '<img src="'+thumbnail+'" >'
                    $(video).empty();
                    $(video).append(thumb_tag);
                    $(file_id).val(obj.id);
                    $(drop_options).click(function() {
                        if ($(this).parent().find("ul.movie-options").css('display') == 'none'){
                            $(this).parent().find("ul.movie-options").show();
                            $(this).parent().find("span").css('color','#2292C0');
                        }
                        else {
                            $(this).parent().find("ul.movie-options").hide();
                            $(this).parent().find("span").css('color','#666666');
                        }
                        return false;
                    });
                    $(remove_clip).click(function () {
                        $.ajax({
                            url: "/clip/"+obj.id+"/remove/",
                        }).done(function(d) { 
                            // console.log(d);
                            $(dropped).parent().remove();
                        });
                        return false;
                    });
                    $.ajax({
                        url: "/check_total_size/",
                    }).done(function(data) {
                        // console.log(data);
                        if (parseInt(data) >= 100) {
                            alert("Clips too big... Try desktop software...");
                            $("#window-alert").css('display', 'block');
                        }
                    });
                } else {
                    var obj = $.parseJSON(data);
                    $(audio_url).val(obj.relative_url);
                    $("#audio-progress").remove();
                    jwplayer('audio-player').setup({
                        'flashplayer': '/site_media/images/player.swf',
                        'id': 'playerID',
                        'width': '218',
                        'height': '160',
                        'file': obj.url,
                        'image': '/site_media/images/music.jpg',
                        // 'controlbar': 'none'
                    });
                }
            });
        } else {
            // qq.addClass(item, this._classes.fail);
            // qq.addClass(uploadeddiv, this._classes.fail);
        }         
    },
    _addToList: function(id, fileName){
        var item = qq.toElement(this._options.fileTemplate);                
        item.qqFileId = id;

        var fileElement = this._find(item, 'file');        
        qq.setText(fileElement, this._formatFileName(fileName));
        this._find(item, 'size').style.display = 'none';        

        this._listElement.appendChild(item);
        item.style.display = 'none';
    },
    _createDiv: function(id, fileName){
        var item = qq.toElement(this._options.newTemplate);
        item.qqFileId = id;
        var drag = $("#drag-drop");
        var fileElement = this._find(item, 'file');
        qq.setText(fileElement, this._formatFileName(fileName));
        this._find(item, 'size').style.display = 'none';
        // $(item).insertAfter(drag[0]);
        $("#sortable-clips").prepend(item);
    },
    _createAudioDiv: function(id, fileName) {
        var item = qq.toElement(this._options.audionewTemplate);
        var drag_audio = $("#drag-drop-audio");
        $("#drag-drop-audio").replaceWith($(item));
    },
    _getItemByFileId: function(id){
        var item = this._listElement.firstChild;        
        
        // there can't be txt nodes in dynamically created list
        // and we can  use nextSibling
        while (item){            
            if (item.qqFileId == id) return item;            
            item = item.nextSibling;
        }          
    },
    _getDivByFileId: function(id){
        var item = $("#sortable-clips > div:nth-child(1)"); 
        
        // there can't be txt nodes in dynamically created list
        // and we can  use nextSibling
        item = item[0];
        while (item){            
            if (item.qqFileId == id) return item;            
            item = item.nextElementSibling;
        }          
    },
    /**
     * delegate click event for cancel link 
     **/
    _bindCancelEvent: function(){
        var self = this,
            list = this._listElement,
            uploadlist = this._uploadlist;
        // console.log(list);
        // console.log(uploadlist);            
        
        qq.attach(list, 'click', function(e){            
            e = e || window.event;
            var target = e.target || e.srcElement;
            
            if (qq.hasClass(target, self._classes.cancel)){                
                qq.preventDefault(e);
               
                var item = target.parentNode;
                self._handler.cancel(item.qqFileId);
                // console.log("asdas");
                // console.log(item);
                // console.log(item.qqFileId);
                qq.remove(item);
            }
        });
        qq.attach(uploadlist, 'click', function(e){
            // console.log("eee");
            var t = e.target || e.srcElement;
            if (qq.hasClass(t, self._classes.cancel)){ 
                qq.preventDefault(e);

                var i = t.parentNode.parentNode.parentNode;
                var qqId = i.qqFileId;
                console.log(qqId);

                self._handler.cancel(qqId);
                // qq.remove(i);
                // console.log(i.parentNode);

                var parent = i.parentNode;
                if (parent) {
                    parent.removeChild(i);
                }

                if (qq.hasClass(i, 'basic_uploader')) {
                    var listelement = $(i).prev()[0];
                    if (listelement){
                        var x = $("#add-slide")[0];
                        var imagelist = $($($(x).find("#upload-image")[0]).find("ul")[0]).has("li");
                        if (imagelist[0]) {
                            imagelist.parentNode.removeChild(imagelist);
                        } else {
                            var cliplist = $($($(x).find("#upload-image")[0]).find("ul")[0]).has("li");
                            if (cliplist[0]) {
                                cliplist.parentNode.removeChild(cliplist);
                            }
                        }
                        $(x).remove();
                    }

                } else {
                    var listelement = self._getItemByFileId(qqId);
                    if (listelement){
                        listelement.parentNode.removeChild(listelement);
                    }
                }
                console.log("list element....");
                console.log(listelement);

                // qq.remove(listelement);
            }
        });
    }    
});
    
qq.UploadDropZone = function(o){
    this._options = {
        element: null,  
        onEnter: function(e){},
        onLeave: function(e){},  
        // is not fired when leaving element by hovering descendants   
        onLeaveNotDescendants: function(e){},   
        onDrop: function(e){}                       
    };
    qq.extend(this._options, o); 
    
    this._element = this._options.element;
    
    this._disableDropOutside();
    this._attachEvents();   
};

qq.UploadDropZone.prototype = {
    _disableDropOutside: function(e){
        // run only once for all instances
        if (!qq.UploadDropZone.dropOutsideDisabled ){

            qq.attach(document, 'dragover', function(e){
                if (e.dataTransfer){
                    e.dataTransfer.dropEffect = 'none';
                    e.preventDefault(); 
                }           
            });
            
            qq.UploadDropZone.dropOutsideDisabled = true; 
        }        
    },
    _attachEvents: function(){
        var self = this;              
                  
        qq.attach(self._element, 'dragover', function(e){
            if (!self._isValidFileDrag(e)) return;
            
            var effect = e.dataTransfer.effectAllowed;
            if (effect == 'move' || effect == 'linkMove'){
                e.dataTransfer.dropEffect = 'move'; // for FF (only move allowed)    
            } else {                    
                e.dataTransfer.dropEffect = 'copy'; // for Chrome
            }
                                                     
            e.stopPropagation();
            e.preventDefault();                                                                    
        });
        
        qq.attach(self._element, 'dragenter', function(e){
            if (!self._isValidFileDrag(e)) return;
                        
            self._options.onEnter(e);
        });
        
        qq.attach(self._element, 'dragleave', function(e){
            if (!self._isValidFileDrag(e)) return;
            
            self._options.onLeave(e);
            
            var relatedTarget = document.elementFromPoint(e.clientX, e.clientY);                      
            // do not fire when moving a mouse over a descendant
            if (qq.contains(this, relatedTarget)) return;
                        
            self._options.onLeaveNotDescendants(e); 
        });
                
        qq.attach(self._element, 'drop', function(e){
            if (!self._isValidFileDrag(e)) return;
            
            e.preventDefault();
            self._options.onDrop(e);
        });          
    },
    _isValidFileDrag: function(e){
        var dt = e.dataTransfer,
            // do not check dt.types.contains in webkit, because it crashes safari 4            
            isWebkit = navigator.userAgent.indexOf("AppleWebKit") > -1;                        

        // dt.effectAllowed is none in Safari 5
        // dt.types.contains check is for firefox            
        return dt && dt.effectAllowed != 'none' && 
            (dt.files || (!isWebkit && dt.types.contains && dt.types.contains('Files')));
        
    }        
}; 

qq.UploadButton = function(o){
    this._options = {
        element: null,  
        // if set to true adds multiple attribute to file input      
        multiple: false,
        // name attribute of file input
        name: 'file',
        onChange: function(input){},
        hoverClass: 'qq-upload-button-hover',
        focusClass: 'qq-upload-button-focus'                       
    };
    
    qq.extend(this._options, o);
        
    this._element = this._options.element;
    
    // make button suitable container for input
    qq.css(this._element, {
        position: 'relative',
        overflow: 'hidden',
        // Make sure browse button is in the right side
        // in Internet Explorer
        direction: 'ltr'
    });   
    
    this._input = this._createInput();
};

qq.UploadButton.prototype = {
    /* returns file input element */    
    getInput: function(){
        return this._input;
    },
    /* cleans/recreates the file input */
    reset: function(){
        if (this._input.parentNode){
            qq.remove(this._input);    
        }                
        
        qq.removeClass(this._element, this._options.focusClass);
        this._input = this._createInput();
    },    
    _createInput: function(){                
        var input = document.createElement("input");
        
        if (this._options.multiple){
            input.setAttribute("multiple", "multiple");
        }
                
        input.setAttribute("type", "file");
        input.setAttribute("name", this._options.name);
        
        qq.css(input, {
            position: 'absolute',
            // in Opera only 'browse' button
            // is clickable and it is located at
            // the right side of the input
            right: 0,
            top: 0,
            fontFamily: 'Arial',
            // 4 persons reported this, the max values that worked for them were 243, 236, 236, 118
            fontSize: '118px',
            margin: 0,
            padding: 0,
            cursor: 'pointer',
            opacity: 0
        });
        
        this._element.appendChild(input);

        var self = this;
        qq.attach(input, 'change', function(){
            self._options.onChange(input);
        });
                
        qq.attach(input, 'mouseover', function(){
            qq.addClass(self._element, self._options.hoverClass);
        });
        qq.attach(input, 'mouseout', function(){
            qq.removeClass(self._element, self._options.hoverClass);
        });
        qq.attach(input, 'focus', function(){
            qq.addClass(self._element, self._options.focusClass);
        });
        qq.attach(input, 'blur', function(){
            qq.removeClass(self._element, self._options.focusClass);
        });

        // IE and Opera, unfortunately have 2 tab stops on file input
        // which is unacceptable in our case, disable keyboard access
        if (window.attachEvent){
            // it is IE or Opera
            input.setAttribute('tabIndex', "-1");
        }

        return input;            
    }        
};

/**
 * Class for uploading files, uploading itself is handled by child classes
 */
qq.UploadHandlerAbstract = function(o){
    this._options = {
        debug: false,
        action: '/upload.php',
        // maximum number of concurrent uploads        
        maxConnections: 999,
        onProgress: function(id, fileName, loaded, total){},
        onComplete: function(id, fileName, response){},
        onCancel: function(id, fileName){}
    };
    qq.extend(this._options, o);    
    
    this._queue = [];
    // params for files in queue
    this._params = [];
};
qq.UploadHandlerAbstract.prototype = {
    log: function(str){
        if (this._options.debug && window.console) console.log('[uploader] ' + str);        
    },
    /**
     * Adds file or file input to the queue
     * @returns id
     **/    
    add: function(file){},
    /**
     * Sends the file identified by id and additional query params to the server
     */
    upload: function(id, params){
        var len = this._queue.push(id);

        var copy = {};        
        qq.extend(copy, params);
        this._params[id] = copy;        
                
        // if too many active uploads, wait...
        if (len <= this._options.maxConnections){               
            this._upload(id, this._params[id]);
        }
    },
    /**
     * Cancels file upload by id
     */
    cancel: function(id){
        this._cancel(id);
        this._dequeue(id);
    },
    /**
     * Cancells all uploads
     */
    cancelAll: function(){
        for (var i=0; i<this._queue.length; i++){
            this._cancel(this._queue[i]);
        }
        this._queue = [];
    },
    /**
     * Returns name of the file identified by id
     */
    getName: function(id){},
    /**
     * Returns size of the file identified by id
     */          
    getSize: function(id){},
    /**
     * Returns id of files being uploaded or
     * waiting for their turn
     */
    getQueue: function(){
        return this._queue;
    },
    /**
     * Actual upload method
     */
    _upload: function(id){},
    /**
     * Actual cancel method
     */
    _cancel: function(id){},     
    /**
     * Removes element from queue, starts upload of next
     */
    _dequeue: function(id){
        var i = qq.indexOf(this._queue, id);
        this._queue.splice(i, 1);
                
        var max = this._options.maxConnections;
        
        if (this._queue.length >= max && i < max){
            var nextId = this._queue[max-1];
            this._upload(nextId, this._params[nextId]);
        }
    }        
};

/**
 * Class for uploading files using form and iframe
 * @inherits qq.UploadHandlerAbstract
 */
qq.UploadHandlerForm = function(o){
    qq.UploadHandlerAbstract.apply(this, arguments);
       
    this._inputs = {};
};
// @inherits qq.UploadHandlerAbstract
qq.extend(qq.UploadHandlerForm.prototype, qq.UploadHandlerAbstract.prototype);

qq.extend(qq.UploadHandlerForm.prototype, {
    add: function(fileInput){
        fileInput.setAttribute('name', 'qqfile');
        var id = 'qq-upload-handler-iframe' + qq.getUniqueId();       
        
        this._inputs[id] = fileInput;
        
        // remove file input from DOM
        if (fileInput.parentNode){
            qq.remove(fileInput);
        }
                
        return id;
    },
    getName: function(id){
        // get input value and remove path to normalize
        return this._inputs[id].value.replace(/.*(\/|\\)/, "");
    },    
    _cancel: function(id){
        this._options.onCancel(id, this.getName(id));
        
        delete this._inputs[id];        

        var iframe = document.getElementById(id);
        if (iframe){
            // to cancel request set src to something else
            // we use src="javascript:false;" because it doesn't
            // trigger ie6 prompt on https
            iframe.setAttribute('src', 'javascript:false;');

            qq.remove(iframe);
        }
    },     
    _upload: function(id, params){                        
        var input = this._inputs[id];
        
        if (!input){
            throw new Error('file with passed id was not added, or already uploaded or cancelled');
        }                

        var fileName = this.getName(id);
                
        var iframe = this._createIframe(id);
        var form = this._createForm(iframe, params);
        form.appendChild(input);

        var self = this;
        this._attachLoadEvent(iframe, function(){                                 
            self.log('iframe loaded');
            
            var response = self._getIframeContentJSON(iframe);

            self._options.onComplete(id, fileName, response);
            self._dequeue(id);
            
            delete self._inputs[id];
            // timeout added to fix busy state in FF3.6
            setTimeout(function(){
                qq.remove(iframe);
            }, 1);
        });

        form.submit();        
        qq.remove(form);        
        
        return id;
    }, 
    _attachLoadEvent: function(iframe, callback){
        qq.attach(iframe, 'load', function(){
            // when we remove iframe from dom
            // the request stops, but in IE load
            // event fires
            if (!iframe.parentNode){
                return;
            }

            // fixing Opera 10.53
            if (iframe.contentDocument &&
                iframe.contentDocument.body &&
                iframe.contentDocument.body.innerHTML == "false"){
                // In Opera event is fired second time
                // when body.innerHTML changed from false
                // to server response approx. after 1 sec
                // when we upload file with iframe
                return;
            }

            callback();
        });
    },
    /**
     * Returns json object received by iframe from server.
     */
    _getIframeContentJSON: function(iframe){
        // iframe.contentWindow.document - for IE<7
        var doc = iframe.contentDocument ? iframe.contentDocument: iframe.contentWindow.document,
            response;
        
        this.log("converting iframe's innerHTML to JSON");
        this.log("innerHTML = " + doc.body.innerHTML);
                        
        try {
            response = eval("(" + doc.body.innerHTML + ")");
        } catch(err){
            response = {};
        }        

        return response;
    },
    /**
     * Creates iframe with unique name
     */
    _createIframe: function(id){
        // We can't use following code as the name attribute
        // won't be properly registered in IE6, and new window
        // on form submit will open
        // var iframe = document.createElement('iframe');
        // iframe.setAttribute('name', id);

        var iframe = qq.toElement('<iframe src="javascript:false;" name="' + id + '" />');
        // src="javascript:false;" removes ie6 prompt on https

        iframe.setAttribute('id', id);

        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        return iframe;
    },
    /**
     * Creates form, that will be submitted to iframe
     */
    _createForm: function(iframe, params){
        // We can't use the following code in IE6
        // var form = document.createElement('form');
        // form.setAttribute('method', 'post');
        // form.setAttribute('enctype', 'multipart/form-data');
        // Because in this case file won't be attached to request
        var form = qq.toElement('<form method="post" enctype="multipart/form-data"></form>');

        var queryString = qq.obj2url(params, this._options.action);

        form.setAttribute('action', queryString);
        form.setAttribute('target', iframe.name);
        form.style.display = 'none';
        document.body.appendChild(form);

        return form;
    }
});

/**
 * Class for uploading files using xhr
 * @inherits qq.UploadHandlerAbstract
 */
qq.UploadHandlerXhr = function(o){
    qq.UploadHandlerAbstract.apply(this, arguments);

    this._files = [];
    this._xhrs = [];
    
    // current loaded size in bytes for each file 
    this._loaded = [];
};

// static method
qq.UploadHandlerXhr.isSupported = function(){
    var input = document.createElement('input');
    input.type = 'file';        
    
    return (
        'multiple' in input &&
        typeof File != "undefined" &&
        typeof (new XMLHttpRequest()).upload != "undefined" );       
};

// @inherits qq.UploadHandlerAbstract
qq.extend(qq.UploadHandlerXhr.prototype, qq.UploadHandlerAbstract.prototype)

qq.extend(qq.UploadHandlerXhr.prototype, {
    /**
     * Adds file to the queue
     * Returns id to use with upload, cancel
     **/    
    add: function(file){
        if (!(file instanceof File)){
            throw new Error('Passed obj in not a File (in qq.UploadHandlerXhr)');
        }
                
        return this._files.push(file) - 1;        
    },
    getName: function(id){        
        var file = this._files[id];
        // console.log("getname...");
        // console.log(file);
        // fix missing name in Safari 4
        // return file.fileName != null ? file.fileName : file.name; 
        if (file) {
            if (file.fileName != null) {
                var x = file.fileName;
                // console.log(x);
            } else {
                var x = file.name;
            }
        }
        // var x = file.fileName != null ? file.fileName : file.name;  

        // console.log(x);
        return x;
    },
    getSize: function(id){
        var file = this._files[id];
        return file.fileSize != null ? file.fileSize : file.size;
    },    
    /**
     * Returns uploaded bytes for file identified by id 
     */    
    getLoaded: function(id){
        return this._loaded[id] || 0; 
    },
    /**
     * Sends the file identified by id and additional query params to the server
     * @param {Object} params name-value string pairs
     */    
    _upload: function(id, params){
        var file = this._files[id],
            name = this.getName(id),
            size = this.getSize(id);
                
        this._loaded[id] = 0;
                                
        var xhr = this._xhrs[id] = new XMLHttpRequest();
        var self = this;
                                        
        xhr.upload.onprogress = function(e){
            if (e.lengthComputable){
                console.log("xhr upload");
                self._loaded[id] = e.loaded;
                self._options.onProgress(id, name, e.loaded, e.total);
            }
        };

        xhr.onreadystatechange = function(){            
            if (xhr.readyState == 4){
                self._onComplete(id, xhr);                    
            }
        };

        // build query string
        params = params || {};
        params['qqfile'] = name;
        var queryString = qq.obj2url(params, this._options.action);

        xhr.open("POST", queryString, true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-File-Name", encodeURIComponent(name));
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(file);
    },
    _onComplete: function(id, xhr){
        // the request was aborted/cancelled
        if (!this._files[id]) return;
        
        var name = this.getName(id);
        var size = this.getSize(id);
        
        this._options.onProgress(id, name, size, size);
                
        if (xhr.status == 200){
            this.log("xhr - server response received");
            this.log("responseText = " + xhr.responseText);
                        
            var response;
                    
            try {
                response = eval("(" + xhr.responseText + ")");
            } catch(err){
                response = {};
            }
            
            this._options.onComplete(id, name, response);
                        
        } else {                   
            this._options.onComplete(id, name, {});
            // alert("Connection Error");
        }
                
        this._files[id] = null;
        this._xhrs[id] = null;    
        this._dequeue(id);                    
    },
    _cancel: function(id){
        // console.log("cancel....");
        // console.log(id);
        // console.log(this.getName(id));
        this._options.onCancel(id, this.getName(id));
        
        this._files[id] = null;
        
        if (this._xhrs[id]){
            this._xhrs[id].abort();
            this._xhrs[id] = null;                                   
        }
        // console.log("cancel completed...");
    }
});

$(document).ready(function(){
	$(".drop-options").click(function() {
		if ($(this).parent().find("ul.movie-options").css('display') == 'none'){
			$(this).parent().find("ul.movie-options").show();
			$(this).parent().find("span").css('color','#2292C0');
		}
		else {
			$(this).parent().find("ul.movie-options").hide();
			$(this).parent().find("span").css('color','#666666');
		}

	});
	// $(".drop-options").blur(function() {
	// 	$(this).parent().find("ul.movie-options").hide();
	// });

	edit_title = function(){

		$('.current_title').hide();
		$('#title_div').replaceWith('<div id="title_div" ><input type="text" maxlength="55" style="border:transparent;height:38px;width:464px;"id="newtitle" value="'+ $('.current_title').text() + '" /></div>');

		$("#newtitle").blur(function() {
			
			$('.current_title').text($('#newtitle').val());
			$('#title-input').val($('#newtitle').val());
			$('#title_div').replaceWith('<div id="title_div"></div>');
			$('.current_title').show();
		});
	};

	removeclip = function(id){
		$.ajax({
			url: "/clip/"+id+"/remove/"
		}).done(function(data) { 
			$("#clip-"+id).remove();
		});
	};

	getsubcategory = function(obj,id){
		if($(obj).parent("li").hasClass("arrow_down")){
			$(obj).parent("li").removeClass("arrow_down");
		}
		else
		{
			$(obj).parent("li").addClass("arrow_down");
		}
		if($(obj).siblings()[0]){
			$(obj).siblings().toggle();
		}
		else{
		$($(obj)[0]).addClass("occasion_main");
		var occasion_id = id;
		$.ajax({
			url:"/rumblefish/"+id+"/getsubcategory/"
		}).done(function(data) {
			$("#rumblefish_occasion_"+occasion_id).append(data);
		});
		return false;
	}
	};

	arrowdown=function(obj){
		if($(obj).parent("li").hasClass("arrow_down")){
			$(obj).parent("li").removeClass("arrow_down");
		}
		else
		{
			$(obj).parent("li").addClass("arrow_down");
		}
	}

	getplaylist = function(id){
		// $("#test").html("");
		$("#track-list").html("<img class='loading' src='/site_media/images/loading.gif' />")
		$.ajax({
			url: "/rumblefish/"+id+"/detail/"
		}).done(function(data) {
			// if ($("#track")[0]) {
			// 	//
			// } else {
			// 	$("#rumblefish").css('display', 'none');
			// 	$('#select-store').append(data);
			// }
			$("#track-list").empty();
			$("#track-list").html(data);
		});
		return false;
	};

	callRumblefish = function(){
		if ($("#rumblefish")[0]) {
			if ($("#track")[0]) {
				$("#track").remove();
			}
			$('#rumblefish').remove();
			$($('#select-store').prev()).css('position', 'static');
		} else {
			// $.ajax({
			// 	url: '/rumblefish/'
			// }).done(function(data){
			// 	$('#select-store').append(data);
			// 	$($('#select-store').prev()).css('position', 'absolute');
			// 	$('#select-store').css('position', 'relative');
			// })
		}
	};

	backToAll = function(){
		$("#track").remove();
		$("#rumblefish").css('display', 'block');
	}

	selectAlbum = function(){
		$("#rumblefish_media_id").val($('.swPage > .selected > input').val());
		$("#rumblefish_preview_url").val($(".swPage > li.selected > a").attr('href'));
		$("#track").remove();
		$("#rumblefish").remove();
		$($('#select-store').prev()).css('position', 'static');
		var rumble_media = $("#rumblefish_preview_url").val()
		if (rumble_media) {
			$("#audio-uploader").css('display', 'none');
			jwplayer('rumble-player').setup({
				'flashplayer': '/site_media/images/player.swf',
				'id': 'playerID',
				'width': '218',
				'height': '160',
				'file': rumble_media,
				'image': '/site_media/images/music.jpg',
				// 'controlbar': 'none'
			});
		} else {
			$("#audio-uploader").css('display', 'block');
			$("#rumble-player_wrapper").remove();
		}
	}

	var filter = $.parseJSON($('#id_filter').val());
	jwplayer('mediaplayer').setup({
		'flashplayer': '/site_media/images/player.swf',
		'id': 'playerID',
		'width': '206',
		'height': '116',
		'file': '/site_media/images/film.png',
		'image': '/site_media/images/film.png',
		'controlbar': 'none',
		'icons': 'false',
		'screencolor': 'FFFFFF'
	});

	$(function() {
		$("#sortable-clips").sortable();
	});

	addslide = function(){

		var slide_div = '<div id="add-slide" class="grid_4 grid_4_box2 slide-container">'+
								'<div class="add-slide">'+
									'Add a slide'+
									'<div id="upload-clip" class="add-slide-sub shadow">Clip</div>'+
									'<div id="upload-image" class="add-slide-sub shadow">Image</div>'+
									'<div class="add-slide-sub shadow">Title screen</div>'+
								'</div>'+
							'</div>';
		if ($("#add-slide")[0]) {
			console.log("New slide already exists");
		} else {
			if ($("#upload-clip")[0]) {
				$("#upload-clip").removeAttr('id');
			}
			if ($("#upload-image")[0]) {
				$("#upload-image").removeAttr('id');
			}
			$("#sortable-clips").append(slide_div);
			var uploader = new qq.FileUploaderBasic({
			    // pass the dom node (ex. $(selector)[0] for jQuery users)
			    element: document.getElementById('upload-clip'),
			    // path to server-side upload script
			    action: '/uploader/',
			    allowedExtensions: ['3gp', 'asf', 'asx', 'avi', 'flv', 'm4v', 'mkv', 'mov', 'mp4', 'mpg', 'ogv', 'rm', 'wmv'],
			});
			var uploader = new qq.FileUploaderBasic({
			    // pass the dom node (ex. $(selector)[0] for jQuery users)
			    element: document.getElementById('upload-image'),
			    // path to server-side upload script
			    action: '/uploader/',
			    allowedExtensions: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'tga', 'tif', 'yuv'],
			});
		}
	};

	$("#submit-movie").click(function(ev){
		var target = ev.target;
		console.log(target.parentNode.parentNode);
	console.log("submit clicked...");
		if ($(".uploading")[0]) {
			ev.preventDefault();
			return false;
		}
		if ($("#sortable-clips").children()[0]) {
			// do nothing...
		} else {
			ev.preventDefault();
			return false;
		}
	})

	$("#theme_change").click(function(ev){
		ev.preventDefault();
		$("#lightbox-overlay").css('height', $(document).height());
		$("#lightbox-overlay").css('display', 'block');
		$("#lightbox-bg").css('display', 'block');
	});

	$("#lightbox-overlay").click(function() {
		$("#lightbox-bg").css('display', 'none');
		$("#lightboxmusic-bg").css('display', 'none');
		$("#lightbox-overlay").css('display', 'none');
	});

	$("#close-theme").click(function(ev){
		ev.preventDefault();
		$("#lightbox-bg").css('display', 'none');
		$("#lightbox-overlay").css('display', 'none');
	});

	$("#done-theme").click(function(ev){
		ev.preventDefault();
		$("#lightbox-bg").css('display', 'none');
		$("#lightbox-overlay").css('display', 'none');
		var selected = $(".lightbox-theme-selected > .theme-detail");
		if (selected[0]) {
			var theme = $(selected[0]).val();
			// console.log(theme);
			$("#filter").val(theme);
			var obj = $.parseJSON(theme);
			var playlist;
			playlist = { file: obj.example_url, image: obj.thumbnail_url }
			jwplayer('mediaplayer').load(playlist);
		}
	});

	$(".lightbox-video").click(function(){
		$(this).parent().siblings().removeClass('lightbox-theme-selected');
		$(this).parent().addClass('lightbox-theme-selected');
	});

	$("#close-music").click(function(ev){
		ev.preventDefault();
		$("#lightboxmusic-bg").css('display', 'none');
		$("#lightbox-overlay").css('display', 'none');
	});

	add_sample_player=function(id)
	{
		//$("#rumblefish_preview_url").val($(".lightbox-music-selected > .track > a").attr('href'));
		url=$("#"+id).val()
		var sample_media = url //$("#rumblefish_preview_url").val()
		console.log(sample_media);
		if (sample_media) {
			jwplayer('sample_player').setup({

			    // 'flashplayer': '/site_media/images/player.swf',
			    // 'id': 'playerID',
			    // 'duration': '30',
			    // 'file': rumble_media,
			    // 'skin': '/site_media/jwplayer/glow.xml',
			    // 'controlbar': 'bottom',
			    // 'width': '218',
			    // 'height': '24'


				'flashplayer': '/site_media/images/player.swf',
				'id': 'playerID',
				'duration': '30',
				'autostart': 'true',
    			'controlbar': 'bottom',
    			'width': '400',
    			'height': '24',
    			'file': sample_media
			});
		} else {
		}
	};
	// close_lightbox = function(){
	// 	$("#lightbox-bg").css('display', 'none');
	// 	$("#lightbox-overlay").css('display', 'none');
	// };

	// open_lightbox = function(){
	// 	$("#lightbox-bg").css('display', 'none');
	// 	$("#lightbox-overlay").css('display', 'none');
	// };

	$("#done-music").click(function(ev){
		ev.preventDefault();
		$("#lightboxmusic-bg").css('display', 'none');
		$("#lightbox-overlay").css('display', 'none');
		$("#rumblefish_media_id").val($(".lightbox-music-selected > .track-id").val());
		$("#rumblefish_preview_url").val($(".lightbox-music-selected > .track_url").val());
		var rumble_media = $("#rumblefish_preview_url").val()
		if (rumble_media) {
			$("#audio-uploader").css('display', 'none');
			jwplayer('rumble-player').setup({

			    // 'flashplayer': '/site_media/images/player.swf',
			    // 'id': 'playerID',
			    // 'duration': '30',
			    // 'file': rumble_media,
			    // 'skin': '/site_media/jwplayer/glow.xml',
			    // 'controlbar': 'bottom',
			    // 'width': '218',
			    // 'height': '24'


				'flashplayer': '/site_media/images/player.swf',
				'id': 'playerID',
				'duration': '30',
				'width': '218',
				'height': '158',
				'skin': '/site_media/jwplayer/glow.xml',
				'file': rumble_media,
				'image': '/site_media/images/music2.jpg',
				'controlbar': 'none'
			});
		} else {
		}
	});

});
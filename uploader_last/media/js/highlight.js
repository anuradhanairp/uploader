// $.noConflict();
$(document).ready(function() {

	play_video = function(id){
			$.ajax({
				url: "/library/"+id+"/play/",
				context: document.body
			}).done(function(data) { 
				$("#player").empty();
				$("#player").append(data);
				$("#player").show(1000);
				$('.current_title').click(function(){
	
					$('.current_title').hide();
					$('#title_div').replaceWith('<div id="title_div" ><input type="text" id="newtitle" value="' + $('.current_title').text() + '" /><input type=button id="newtsub" value="update"/></div>');

					$("#newtsub").click(function() {
						
						$('.current_title').text($('#newtitle').val());
						$('#title_div').replaceWith('<div id="title_div"></div>');
						$('.current_title').show();
						$.ajax({
							url: "/library/"+id+"/edit/",
							data: { title: $('.current_title').text()},
						}).done(function(data) { 
							console.log(data);
						});
					});
				});

				$('div.expandable p').expander({
				    slicePoint:       70,  // default is 100
				    expandPrefix:     ' ', // default is '... '
				    expandText:       '...', // default is 'read more'
				    collapseTimer:    0, // re-collapses after 5 seconds; default is 0, so no re-collapsing
				    userCollapseText: '[^]'  // default is 'read less'
			  	});

				hide_palyer = function(){
					$('#player').hide(500);
				};

			});
		}


		play_minimovie = function(url, title, thumbnail){
			$.ajax({
				url: "/movie/play/",
				data: {'url':url, 'title':title, 'thumbnail':thumbnail},
				context: document.body
			}).done(function(data) { 
				$("#player").empty();
				$("#player").append(data);
				$("#player").show(1000);
				
				hide_palyer = function(){
					$('#player').hide(500);
				};

				$('div.expandable p').expander({
				    slicePoint:       70,  // default is 100
				    expandPrefix:     ' ', // default is '... '
				    expandText:       '...', // default is 'read more'
				    collapseTimer:    0, // re-collapses after 5 seconds; default is 0, so no re-collapsing
				    userCollapseText: '[^]'  // default is 'read less'
			  	});
			});
		}

});

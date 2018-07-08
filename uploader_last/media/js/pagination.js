(function($){

// Creating the sweetPages jQuery plugin:
$.fn.sweetPages = function(opts){
	
	// If no options were passed, create an empty opts object
	if(!opts) opts = {};
	
	var resultsPerPage = opts.perPage || 3;
	
	// The plugin works best for unordered lists, althugh ols would do just as well:
	var ul = this;
	var li = ul.find('li');
	
	li.each(function(){
		// Calculating the height of each li element, and storing it with the data method:
		var el = $(this);
		el.data('height',el.outerHeight(true));
	});
	
	// Calculating the total number of pages:
	var pagesNumber = Math.ceil(li.length/resultsPerPage);
	
	// If the pages are less than two, do nothing:
	if(pagesNumber<2) return this;

	// Creating the controls div:
	var swControls = $('<div class="swControls">');
	
	for(var i=0;i<pagesNumber;i++)
	{
		// Slice a portion of the lis, and wrap it in a swPage div:
		li.slice(i*resultsPerPage,(i+1)*resultsPerPage).wrapAll('<div class="swPage" />');
		
		// Adding a link to the swControls div:
		swControls.append('<a href="" class="swShowPage swShowPage'+(i+1)+'">'+(i+1)+'</a>');
	}

	ul.append(swControls);
	var next = $('<a class="next" href=""><img src="/site_media/images/arrow-left.jpg" align="left"  style="margin:6px 0 0 6px;"/><input type="hidden" value=0 /></a>');
	$("#track").append(next);
	var previous = $('<a class="previous" href=""><img src="/site_media/images/arrow-right.jpg" align="right" style="margin:6px 6px 0px 0;"/><input type="hidden" value=2 /></a>');
	$("#track").append(previous);
	
	var maxHeight = 0;
	var totalWidth = 0;
	
	var swPage = ul.find('.swPage');
	swPage.each(function(){
		
		// Looping through all the newly created pages:
		
		var elem = $(this);

		var tmpHeight = 0;
		elem.find('li').each(function(){tmpHeight+=$(this).data('height');});

		if(tmpHeight>maxHeight)
			maxHeight = tmpHeight;

		totalWidth+=elem.outerWidth();
		
		elem.css('float','left').width(ul.width());
	});
	
	swPage.wrapAll('<div class="swSlider" />');
	
	// Setting the height of the ul to the height of the tallest page:
	ul.height(maxHeight);
	
	var swSlider = ul.find('.swSlider');
	swSlider.append('<div class="clear" />').width(totalWidth);

	var nex = $("#track").find('.next')
	var prev = $("#track").find('.previous')

	var hyperLinks = ul.find('a.swShowPage');
	
	hyperLinks.click(function(e){
		
		// If one of the control links is clicked, slide the swSlider div 
		// (which contains all the pages) and mark it as active:

		$(this).addClass('active').siblings().removeClass('active');
		$($(next).find('input')).val(parseInt($(this).text())-1);
		$($(previous).find('input')).val(parseInt($(this).text())+1);
		
		swSlider.stop().animate({'margin-left':-(parseInt($(this).text())-1)*ul.width()},'slow');
		e.preventDefault();
	});
	
	// Mark the first link as active the first time this code runs:
	hyperLinks.eq(0).addClass('active');
	
	prev.click(function(e){
		var inval = $($(this).find('input')).val();
		if (parseInt(inval) == pagesNumber+1) {
			e.preventDefault();
		} else {
			var prevVal = $(nex).find('input').val();
			var cls = 'a.swShowPage'+inval;
			var pg = $(cls);
			$(pg).addClass('active').siblings().removeClass('active');
			swSlider.stop().animate({'margin-left':-(inval-1)*ul.width()},'slow');
			$(this).find('input').val(parseInt(inval)+1);
			$(nex).find('input').val((parseInt(prevVal)+1));
			e.preventDefault();
		}
	});
	
	nex.click(function(e){
		var inval = $($(this).find('input')).val();
		if (parseInt(inval) == 0) {
			e.preventDefault();
		} else {
			nexVal = $(prev).find('input').val();
			var cls = 'a.swShowPage'+(parseInt(inval));
			var pg = $(cls);
			$(pg).addClass('active').siblings().removeClass('active');
			swSlider.stop().animate({'margin-left':-(inval-1)*ul.width()},'slow');
			$(this).find('input').val(parseInt(inval)-1);
			$(prev).find('input').val((parseInt(nexVal)-1));
			e.preventDefault();
		}
	});

	$(".swPage > li").click(function(e){
		if ($(this).hasClass('selected')) {
			$(this).removeClass('selected')
		} else {
			$(".swPage > li.selected").removeClass('selected');
			$(this).addClass('selected');
		}
	});

	// Center the control div:
	// swControls.css({
	// 	'left':'50%',
	// 	'margin-left':-swControls.width()/2
	// });
	
	return this;
	
}})(jQuery);


$(document).ready(function(){
	/* The following code is executed once the DOM is loaded */
	
	// Calling the jQuery plugin and splitting the
	// #holder UL into pages of 3 LIs each:
	
	$('#holder').sweetPages({perPage:12});
	
	// The default behaviour of the plugin is to insert the 
	// page links in the ul, but we need them in the main container:

	var controls = $('.swControls').detach();
	controls.appendTo('#track');
	
});

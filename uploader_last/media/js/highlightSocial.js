$(document).ready(function(){

   highlightLike = function(uuid){
        $.ajax({
            url: "/highlightLike/",
            data: {'uuid': uuid},
            type: "GET",
        }).done(function(data){
            console.log(data);
            }
        )
        return true;
   };

function stream_callback (post_id, exception) {
alert("it worked");
}

  highlightFriendShare = function(uuid,thumbnail){
    $.ajax({
        url: "/highlightFriendShare/",
        data: {'uuid': uuid},
        type: "GET",
    }).done(function(data){
            console.log(data);

	postToFeed(thumbnail);

  });
       
            
    return true;
   };

  highlightFriendShare = function(comment){
    $.ajax({
        url: "/highlightComment/",
        data: {'uuid': uuid},
        type: "GET",
    }).done(function(data){
            console.log(data);

  postToFeed(thumbnail);

  });
       
            
    return true;
   };

   
  function postToFeed(thumbnail) {

    // calling the API ...
    var obj = {
      method: 'feed',
      link: 'http://usdemo4.highlightcam.com/',
      picture: thumbnail,
      name: 'Facebook Dialogs',
      caption: 'Reference Documentation',
      description: 'Using Dialogs to interact with users.'
    };

    function callback(response) {
      // document.getElementById('msg').innerHTML = "Post ID: " + response['post_id'];
      alert('facebook share done');
    }

    FB.ui(obj, callback);
  }
  function postCommentToFeed() {
         
      FB.ui(
      {
       method: 'feed',
       message: 'getting educated about Facebook Connect',
       name: 'Connect',
       caption: 'The Facebook Connect JavaScript SDK',
          description: (
          'A small JavaScript library that allows you to harness ' +
          'the power of Facebook, bringing the user\'s identity, ' +
          'social graph and distribution power to your site.'
       ),
       link: 'http://usdemo4.highlightcam.com/',
       picture: '',
       actions: [
            { name: 'fbrell', link: 'http://usdemo4.highlightcam.com/' }
       ],
      user_message_prompt: 'Share your thoughts about RELL'
      },
      function(response) {
        if (response && response.post_id) {
          alert('Post was published.');
        } else {
          alert('Post was not published.');
        }
      }
    );

    }
});
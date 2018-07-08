from django.conf.urls.defaults import patterns, include, url
from django.views.generic.simple import direct_to_template
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('uploader_last.web.views',
    # Examples:
    # url(r'^$', 'uploader.views.home', name='home'),
    # url(r'^uploader/', include('uploader.foo.urls')),
    url(r'^$', 'home', name='home'),
    url(r'^fbpage/$', 'fbpage', name='fbpage'),
    url(r'^feedpage/$', 'feedpage', name='feedpage'),
    url(r'^video/(?P<uuid>\w+)/$', 'video', name='video'),
    url(r'^feed/','feed', name='feed'),
    url(r'^checkuserfb/','checkuserfb'),
    url(r'^uploadify/$', 'uploadify', name='uploadify'),
    url(r'^uploader/$', 'upload_file', name='upload_file'),
    # url(r'^process/$', 'process_upload', name='process_upload'),
    url(r'^rumblefish/$', 'rumblefish', name='rumblefish'),
    url(r'^rumblefish/(?P<id>\d+)/detail/$', 'getrumblefishplaylist', name='getrumblefishplaylist'),
    url(r'^rumblefish/(?P<id>\d+)/getsubcategory/$', 'getrumblefishsubcategory', name='getrumblefishsubcategory'),

    url(r'^render/$', 'render', name='render'),
    url(r'^library/$', 'library', name='library'),
    url(r'^my_movies/$', 'my_movies', name='my_movies'),
    url(r'^library/(?P<id>\d+)/edit/$', 'edit_title', name='edit_title'),
    url(r'^library/(?P<id>\d+)/play/$', 'play_video', name='play_video'),
    url(r'^movie/play/$', 'play_movie', name='play_movie'),
    url(r'^test/$', 'test', name='test'),
    url(r'^clip/(?P<id>\d+)/remove/$', 'remove_clip', name='remove_clip'),
    url(r'^task_status/$', 'task_status', name='task_status'),
    url(r'^audio_upload/$', 'audio_upload', name='audio_upload'),
    url(r'^predict_time/$', 'predict_time', name='predict_time'),
    url(r'^gallery_test/$', 'gallery_test', name='gallery_test'),
    url(r'^check_total_size/$', 'check_total_size', name='check_total_size'),
    url(r'^testing_upload/$', 'testing_upload', name='testing_upload'),
    url(r'^highlightComment/$','highlightComment'),
    url(r'^highlightLike/$', 'highlightLike', name='highlightLike'),
    url(r'^highlightFriendShare/$', 'highlightFriendShare', name='highlightFriendShare'),
	url(r'^xd/','xdserve',name='xdserve'),
    url(r'^share/', 'share', name='share'),
    url(r'^(?P<uuid>\w+)/comment/', 'comment', name='comment'),
    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
    url(r'^facebook/', include('web.django_facebook.urls')),
    url(r'^accounts/', include('web.django_facebook.auth_urls'))

)

urlpatterns += patterns('uploader_last.web.authenticate',
    url(r'^login/$', 'hlcam_login', name='login'),
    url(r'^register/$', 'register', name='register'),
    url(r'^logout/$', 'logout', name='logout'),
    url(r'^fb/login/$', 'fblogin', name='fblogin'),
)

urlpatterns += patterns('',
	(r'^site_media/(?P<path>.*)$', 'django.views.static.serve',
		{'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
)

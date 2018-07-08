# Create your views here.
import boto
from boto.s3.connection import S3Connection
from boto.s3.key import Key
import mimetypes
import subprocess
import glob
import os, envoy
import requests
import datetime
import pickle
import json
import random
from celery.result import AsyncResult
# from datetime import datetime
# import time

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.conf import settings
import django.dispatch
from django.views.decorators.csrf import csrf_exempt
from django.core.urlresolvers import reverse
from django.contrib.sessions.models import Session
from django.core.exceptions import ObjectDoesNotExist
# from django_beanstalkd import BeanstalkClient

from web.forms import UploadForm, ProcessUploadForm, RenderForm
from web.models import Upload, UploadCookie, UploadList, RenderedVideo, CreateMovie
from web.S3_upload import upload_file as upload_to_s3
from web.tasks import s3cmd_upload, s3cmd_boto_upload, upload_audio
from web.decorators import logged_in
import mailgunMessage


@csrf_exempt
def home(request):
	try:
		if request.session['userid']:
			return HttpResponseRedirect(reverse('library'))
	except KeyError:
		return render_to_response('home-new.html', {}, context_instance=RequestContext(request))

def fbpage(request):
	return render_to_response('fbpage.html', {}, context_instance=RequestContext(request))

def feedpage(request):
	return render_to_response('feedpage.html', {}, context_instance=RequestContext(request))

@logged_in
def uploadify(request):
	cookie = UploadCookie.objects.get(username=request.session['username'])
	# response = render_to_response('uploadify.html', {}, context_instance=RequestContext(request))
	response = render_to_response('fileupload.html', {}, context_instance=RequestContext(request))
	return response

# @logged_in
@csrf_exempt
@logged_in
def upload_file(request):
	if request.method == "POST":
		try:
			s = Session.objects.get(pk=request.COOKIES['sessionid'])
			userid = s.get_decoded()['userid']
			username = s.get_decoded()['username']
			os.chdir(os.path.join(settings.PROJECT_ROOT, 'upload'))
			if request.FILES:
				try:
					filename = request.POST['Filename'].replace(' ', '_')
					incoming_file = request.FILES['Filedata']
				except KeyError:
					# filename = request.GET['qqfile'].replace(' ', '_')
					incoming_file = request.FILES['qqfile']
					filename = incoming_file.name.replace(' ', '_')
					# print incoming_file.name
				f = open(filename, 'wb')
				for chunk in incoming_file.chunks():
					f.write(chunk)
				f.close()
			else:
				uploaded = request.read
				filesize = int(uploaded.im_self.META["CONTENT_LENGTH"])
				filename = request.GET['qqfile'].replace(' ', '_')
				f = open(filename, 'wb')
				f.write(request.read(filesize))
				f.close()
			mimetype = mimetypes.guess_type(filename)
			mime = mimetype[0].split('/')[0]
			cmd = ""
			print "thumbnail generation..."
			if mime == 'video':
				cmd = "ffmpeg -y -itsoffset -10  -i "+filename+" -vcodec mjpeg -vframes 1 -an -f rawvideo -s 206x116 "+filename+".png"
			elif mime == 'image':
				cmd = "convert "+filename+" -thumbnail 206x116\\! "+filename+".png"
			if cmd:
				print "generation..."
				print cmd
				r = envoy.run(str(cmd))
				print r.status_code
			print "folder change..."
			os.chdir(settings.PROJECT_ROOT)
			print "folder change2..."
			file_path = str(os.path.join(settings.PROJECT_ROOT, 'upload', filename))
			cmd = "s3cmd put "+str(file_path)+" s3://"+str(settings.S3_BUCKET)+"/"+str(filename)
			print "control to celery..."
			x = s3cmd_boto_upload.delay(file_path, settings.S3_BUCKET, s3_filename=filename, userid=userid, username=username, sessionid=request.COOKIES['sessionid'])
			res = {}
			res['success'] = True
			res['task_id'] = x.task_id
		except IOError:
			pass # ignore failed uploads for now
		except Exception as e:
			print e
			print "exception..."

	response = HttpResponse(json.dumps(res))
	# response.write("{success:true}")
	return response

@logged_in
def process_upload(request):
	# print request.session['userid']
	if not request.method == 'POST':
		process_form = ProcessUploadForm(userid=request.session['userid'])
		return render_to_response('process_upload.html', {'form':process_form}, context_instance=RequestContext(request))

	processedlist = UploadList.objects.filter(url=request.POST['url'])
	if processedlist:
		msg = request.POST['url']+" already processed"
		process_form = ProcessUploadForm(userid=request.session['userid'])
		return render_to_response('process_upload.html', {'form':process_form, 'message':msg}, context_instance=RequestContext(request))
	url = "%supload_success/" % (settings.SERVER)
	uploadlist = UploadList()
	uploadlist.username = request.session['username']
	uploadlist.user_id = request.session['userid']
	uploadlist.url = request.POST['url']
	payload = {}
	payload['return_style'] = 'json'
	payload['video'] = request.POST['url']
	payload['keep_seconds'] = 2
	uploadcookie = UploadCookie.objects.get(username=request.session['username'])
	cookie = pickle.loads(str(uploadcookie.cookie))
	r = requests.post(url, cookies=cookie, data=payload)
	print r.status_code
	result_dict = json.loads(r.text)
	uploadlist.uuid = result_dict['highlight_uuid']
	upload = Upload.objects.get(user_id=request.session['userid'], url=request.POST['url'])
	uploadlist.upload = upload
	print uploadlist.uuid
	uploadlist.save()

	process_form = ProcessUploadForm(userid=request.session['userid'])
	return render_to_response('process_upload.html', {'form':process_form}, context_instance=RequestContext(request))

def rumblefish_occassions():
	r = requests.get('http://jp.highlightcam.com/music_store/occasion', data={})
	occasions = r.json['occasions']
	occasion_list=[]
	for occasion in occasions:
		# newdict = {}
		# newdict[occasion['name']] = occasion['id']
		occasion_list.append((occasion['name'], occasion['id']))
	return occasion_list

def occasionplaylist(id):
	rumblefish_playlist = []
	if int(id) in [21, 29]:
		r = requests.get(str(settings.RUMBLEFISH_SERVER_JP)+'occasion?id='+str(id)+'&source='+str(settings.RUMBLEFISH_SOURCE), data={})
	else:
		r = requests.get(settings.RUMBLEFISH_SERVER+'occasion?id='+str(id), data={})
	# print settings.RUMBLEFISH_SERVER_JP+'occasion?id='+str(id)+'&source='+settings.RUMBLEFISH_SOURCE
	e = r.json
	f = e['occasion']['children']
	for g in f:
		h = g['children']
		for i in h:
			ids = i['id']
			if int(id) not in [21, 29]:
				ss = requests.get(settings.RUMBLEFISH_SERVER+'occasion?id='+str(ids), data={})
			else:
				ss = requests.get(settings.RUMBLEFISH_SERVER_JP+'occasion?id='+str(ids)+'&source='+settings.RUMBLEFISH_SOURCE, data={})
			j = ss.json
			pid = j['occasion']['playlists'][0]['id']
			if int(id) not in [21, 29]:
				sp = requests.get(settings.RUMBLEFISH_SERVER+'playlist?id='+str(pid), data={})
				media = sp.json['playlist']['media']
			else:
				sp = requests.get(settings.RUMBLEFISH_SERVER_JP+'playlist?id='+str(pid)+'&source='+settings.RUMBLEFISH_SOURCE, data={})
				media = sp.json['media']
			for k in media:
				album = {}
				album['id'] = k['id']
				album['title'] = k['title']
				album['artist'] = k['artists'][0]['name']
				album['preview_url'] = k['preview_url']
				album['duration'] = ':'.join(str(datetime.timedelta(seconds=k['duration'])).split(':')[1:])
				rumblefish_playlist.append(album)
	rumblefish_playlist.sort(key=lambda a:(a['title']))
	return rumblefish_playlist

def get_theme(request):
	choices = []
	url = "%sapp_startup/" % (settings.SERVER)
	r = requests.post(url)
	filter = r.json['filter_groups']
	# print filter
	for f in filter:
		if f['restrictions'] == 'none':
			for x in f['filters']:
				# choices.append([])
				# print x
				value = {}
				value['call_name'] = x['call_name']
				value['example_url'] = x['example_url']
				value['thumbnail_url'] = x['thumbnail_url']
				choices.append((json.dumps(value), x['display_name']))
	return choices

@logged_in
def render(request):
	if not request.method == 'POST':
		# get_status_of_render(request)
		default_theme = json.dumps({'call_name':""})
		renderform = RenderForm(userid=request.session['userid'])
		createmovie = CreateMovie.objects.filter(user_id=request.session['userid'], session_id=request.COOKIES['sessionid'])
		username = request.session['username']
		themes = get_theme(request)
		occasions= rumblefish_occassions()
		default_occasion_id = occasions[0][1]
		# defaultplaylist = occasionplaylist(default_occasion_id)
		defaultplaylist_file = open(os.path.join(settings.PROJECT_ROOT, 'playlist.json'), 'r')
		defaultplaylist = json.loads(defaultplaylist_file.read())
		# defaultplaylist = None
		return render_to_response('create-new.html', {'createmovie':createmovie, 'username':username, 'form':renderform, 'themes':themes, 'occasions':occasions, 'defaultplaylist':defaultplaylist, 'default_theme':default_theme}, context_instance=RequestContext(request))

	try:
		uploadcookie = UploadCookie.objects.get(username=request.session['username'])
	except ObjectDoesNotExist:
		return HttpResponseRedirect(reverse('logout'))
	filekey = request.POST.getlist('files')
	uuid_list = []
	for key in filekey:
		if key:
			#try/catch to address QA issue where video finishes uploading, but not ready yet in the DB
			try:
				uuid_list.append(CreateMovie.objects.get(id=int(key)).uuid)
			except ObjectDoesNotExist:
				mailgunMessage.send_mail("webapp render error","uuid does not exist","webappRender@hlcam.com",["sgarg@hlcam.com"])
				return HttpResponseRedirect(reverse('render'))

	uuids = ":".join(uuid_list)
	# print uuids
	filter = json.loads(request.POST.get('filter'))
	# print uuid
	renderform = RenderForm(userid=request.session['userid'])
	url = "%srender/" % (settings.SERVER)
	# print request.POST.get('audio')
	cookie = pickle.loads(str(uploadcookie.cookie))
	payload = {}
	payload['uuids'] = uuids
	payload['p__filter'] = filter['call_name']
	payload['p__target_duration'] = request.POST.get('target_duration') if request.POST.get('target_duration') else 30
	payload['fit_duration'] = request.POST.get('fit_duration') if request.POST.get('fit_duration') else 1
	payload['p__quality'] = request.POST.get('quality') if request.POST.get('quality') else 'balanced'
	payload['film_name'] = request.POST.get('title')
	if request.POST.get('audio'):
		payload['soundtrack_url'] = request.POST.get('audio')
	elif request.POST.get('rumblefish_media_id'):
		payload['rumblefish_media_id'] = request.POST.get('rumblefish_media_id')
		payload['p__rumblefish_version'] = 2
	payload['return_style'] = 'json'
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = dict()
	try:
		result_dict = json.loads(r.text)
	except ValueError:
		mailgunMessage.send_mail("webapp render error",r.text,"webappRender@hlcam.com",["sgarg@hlcam.com"])
		return HttpResponseRedirect(reverse('render'))

	try:
		minimovie_uuid = result_dict['highlight_uuid']
	except KeyError:	
		mailgunMessage.send_mail("webapp render error","webapp KeyError does not exist","webappRender@hlcam.com",["sgarg@hlcam.com"])	
		return HttpResponseRedirect(reverse('render'))	

	# movie_detail = get_movie_detail(cookie, minimovie_uuid)
	# print movie_detail
	renderedvideo = RenderedVideo()
	renderedvideo.username = request.session['username']
	renderedvideo.user_id = request.session['userid']

	try:
		renderedvideo.uuid = minimovie_uuid
		renderedvideo.url = "http://videos.highlightcam.s3.amazonaws.com/video_" + minimovie_uuid + ".mp4"
		renderedvideo.save()
		print "http://videos.highlightcam.s3.amazonaws.com/video_" + minimovie_uuid + ".mp4"
		request.session['uuid']=minimovie_uuid
		# if renderform.is_valid():
		# 	print renderform.cleaned_data['files']
		msg = "Your movie is being generated... Please wait for the email confirmation... \
				Find your completed movie at http://videos.highlightcam.s3.amazonaws.com/video_" + minimovie_uuid + ".mp4"
		CreateMovie.objects.filter(user_id=request.session['userid'], session_id=request.COOKIES['sessionid']).delete()
		# return render_to_response('create-new.html', {'form':renderform, 'message':msg}, context_instance=RequestContext(request))
	except UnboundLocalError:
		mailgunMessage.send_mail("webapp render error","unbound local error","webappRender@hlcam.com",["sgarg@hlcam.com"])
		return HttpResponseRedirect(reverse('render'))

	return HttpResponseRedirect(reverse('library'))

def get_movie_detail(cookie, uuid):
	url = "%sgallery/" % (settings.SERVER)
	payload = {}
	payload['return_style'] = 'json'
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	for res in result_dict:
		if res['uuid'] == uuid:
			created_epoch = res['created_epoch']
			created = datetime.datetime.fromtimestamp(created_epoch)
			title = res['title']
			thumbnail_url = res['thumbnail_url']
			source_url = res['source_url']
			return (res['source_url'], res['thumbnail_url'], res['title'], datetime.datetime.fromtimestamp(created_epoch))

def my_movies(request):
	userid = request.session['userid']
	url = "%spredict_time_remaining/" % (settings.SERVER)
	uploadcookie = UploadCookie.objects.get(username=request.session['username'])
	cookie = pickle.loads(str(uploadcookie.cookie))
	movies = RenderedVideo.objects.filter(user_id=userid)
	movie_list = []
	for movie in movies:
		payload = {}
		payload['uuid'] = movie.uuid
		movie_status = get_movie_status(movie.uuid, cookie)
		movie_list.append((movie, movie_status))
	return render_to_response('movies.html', {'movielist':movie_list}, context_instance=RequestContext(request))

def get_movie_status(uuid, cookie):
	url = "%spredict_time_remaining/" % (settings.SERVER)
	payload = {}
	payload['uuid'] = uuid
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	return (result_dict['time_to_complete'], result_dict['time_so_far'], result_dict['status'])

@logged_in
def library(request):
	userid = request.session['userid']
	print userid
	username = request.session['username']
	uuid = None
	try:
		uuid=request.session['uuid']
	except KeyError:
		pass
	try:
		uploadcookie = UploadCookie.objects.get(username=username)
	except ObjectDoesNotExist:
		return HttpResponseRedirect(reverse('logout'))
	# uploads = Upload.objects.filter(user_id=userid)
	url = "%sgallery/" % (settings.SERVER)
	cookie = pickle.loads(str(uploadcookie.cookie))
	payload = {}
	payload['return_style'] = 'json'
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	# print result_dict
	movies = []
	for res in result_dict:
		movie = {}
		movie['thumbnail_url'] = res['preview_url']
		movie['uploaded'] = datetime.datetime.fromtimestamp(res['created_epoch'])
		movie['title'] = res['title']
		movie['source_url'] = res['source_url']
		movie['status'] = res['status']
		movie['uuid'] = res['uuid']
		movies.append(movie)
		# print movie['uuid']
		# print movie['thumbnail_url']
	if uuid:
		return render_to_response('library.html', {'movies':movies, 'username':username, 'uuid':uuid}, context_instance=RequestContext(request))
	return render_to_response('library.html', {'movies':movies, 'username':username}, context_instance=RequestContext(request))

@logged_in
def edit_title(request, id):
	print "title change..."
	library_file = Upload.objects.get(id=id)
	library_file.title = request.GET['title']
	library_file.save()
	return HttpResponse(library_file.title)

@logged_in
def play_video(request, id):
	library_file = Upload.objects.get(id=id)
	response = render_to_response('player.html', {'library_file':library_file}, context_instance=RequestContext(request))
	return HttpResponse(response)

@logged_in
def play_movie(request):
	library_file = {}
	library_file['url'] = request.GET['url']
	library_file['title'] = request.GET['title']
	library_file['thumbnail'] = request.GET['thumbnail']

	response = render_to_response('player.html', {'library_file':library_file}, context_instance=RequestContext(request))
	# print "d"*20,response
	return HttpResponse(response)

def test(request):
	if request.method == 'POST':
		print request.POST.getlist('files')
	form = RenderForm(userid=request.session['userid'])
	response = render_to_response('render.html', {'form':form}, context_instance=RequestContext(request))
	return HttpResponse(response)

@logged_in
def remove_clip(request, id):
	movie = CreateMovie.objects.get(id=id)
	movie.delete()
	return HttpResponse("success")

def task_status(request):
	task_id = request.GET['task']
	progress = True
	while progress:
		status = AsyncResult(task_id)
		if status.ready():
			# print status.result
			return HttpResponse(status.result)

@csrf_exempt
def audio_upload(request):
	os.chdir(os.path.join(settings.PROJECT_ROOT, 'upload'))
	if request.FILES:
		try:
			filename = request.POST['Filename'].replace(' ', '_')
			incoming_file = request.FILES['Filedata']
		except KeyError:
			# filename = request.GET['qqfile'].replace(' ', '_')
			incoming_file = request.FILES['qqfile']
			filename = incoming_file.name.replace(' ', '_')
			# print incoming_file.name
		f = open(filename, 'wb')
		for chunk in incoming_file.chunks():
			f.write(chunk)
		f.close()
	else:
		uploaded = request.read
		filesize = int(uploaded.im_self.META["CONTENT_LENGTH"])
		filename = request.GET['qqfile'].replace(' ', '_')
		f = open(filename, 'wb')
		f.write(request.read(filesize))
		f.close()
	os.chdir(settings.PROJECT_ROOT)
	file_path = str(os.path.join(settings.PROJECT_ROOT, 'upload', filename))
	x = upload_audio.delay(file_path, settings.S3_BUCKET)
	res = {}
	res['success'] = True
	res['task_id'] = x.task_id
	return HttpResponse(json.dumps(res))

@logged_in
def predict_time(request):
	# userid = request.session['userid']
	uuid = request.GET['uuid']
	video_url = request.GET['url']
	title = request.GET['title']
	# uuid, url, title = video_detail.split(',')
	url = "%spredict_time_remaining/" % (settings.SERVER)
	uploadcookie = UploadCookie.objects.get(username=request.session['username'])
	cookie = pickle.loads(str(uploadcookie.cookie))
	payload = {}
	payload['uuid'] = uuid
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	response = {}
	if result_dict['status'] == 0:
		response['completed'] = 'true'
		response['url'] = video_url
		response['title'] = title
		response['thumb'] = settings.PREVIEW_URL + uuid + '.jpg'
		response['date'] = datetime.datetime.now().strftime("%d %b, %Y")
	else:
		response['completed'] = 'false'
		response['thumb'] = settings.PREVIEW_URL + uuid + '.jpg'
		response['time_left'] = result_dict['time_to_complete']
		response['time_covered'] = result_dict['time_so_far']
	return HttpResponse(json.dumps(response))

@logged_in
def gallery_test(request):
	username = request.session['username']
	url = "%sgallery/" % (settings.SERVER)
	uploadcookie = UploadCookie.objects.get(username=username)
	cookie = pickle.loads(str(uploadcookie.cookie))
	payload = {}
	payload['return_style'] = 'json'
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = r.json
	x = filter(lambda x: x['status'] != 0, result_dict)
	return HttpResponse(json.dumps(result_dict))

def rumblefish(request):
	r = requests.get('http://jp.highlightcam.com/music_store/occasion', data={})
	occasions = r.json['occasions']
	occasion_list=[]
	for occasion in occasions:
		# newdict = {}
		# newdict[occasion['name']] = occasion['id']
		occasion_list.append((occasion['name'], occasion['id']))
	return render_to_response('rumblefish.html',{'occasions':occasion_list},context_instance=RequestContext(request))

@logged_in
def highlightLike(request):
	username = request.session['username']
	url = "%sfavorite_video/" % (settings.SERVER)
	videoUuid = request.REQUEST["uuid"]
	payload = {"uuid": videoUuid}
	uploadcookie = UploadCookie.objects.get(username=username)
	cookie = pickle.loads(str(uploadcookie.cookie))
	# Submit POST request with authenticated cookie session from previous step
	# and payload will include just the uuid of the video to be liked.
	r = requests.post(url, data=payload, cookies= cookie)
	result_dict = r.json
	return HttpResponse(json.dumps(result_dict))

#check logged
@logged_in
def highlightFriendShare(request):
	# Share a video to the feed
	username = request.session['username']
	uuid = request.REQUEST["uuid"]
	url = "%sshare_video/" %(settings.SERVER)
	payload = {'uuid': uuid, 'share_type': 'All'}
	uploadcookie = UploadCookie.objects.get(username=username)
	cookie = pickle.loads(str(uploadcookie.cookie))
	# Submit POST request with the payload above
	# with authenticated cookie session from previous step
	# to the server url appended by 'share_video/'
	# The payload includes the uuid of the video to be shared
	# and share_type which can be 'All' or 'Feed'
	r = requests. post(url, data = payload, cookies = cookie)
	result_dict = r.json
	return HttpResponse(json.dumps(result_dict))


def getrumblefishsubcategory(request,id):

	#here we have to make call to get the rumblefish subcategory: work for monday!

	rumblefish_playlist = []
	if int(id) in [21, 29]:
		r = requests.get(str(settings.RUMBLEFISH_SERVER_JP)+'occasion?id='+str(id)+'&source='+str(settings.RUMBLEFISH_SOURCE), data={})
	else:
		r = requests.get(settings.RUMBLEFISH_SERVER+'occasion?id='+str(id), data={})
	e = r.json
	f = e['occasion']['children']
	sb={}
	sb1=[]
	for g in f:
		h = g['children']
		for i in h:
			ids = i['id']
			sb1.append((i['name'],i['id']))
		sb[g['name']]=sb1
		sb1=[]

	return render_to_response('rumblefish_subcategory.html',{'subcategory':sb},context_instance=RequestContext(request))

def getrumblefishplaylist(request,id):
	rumblefish_playlist = []
	# if int(id) in [21, 29]:
	# 	r = requests.get(str(settings.RUMBLEFISH_SERVER_JP)+'occasion?id='+str(id)+'&source='+str(settings.RUMBLEFISH_SOURCE), data={})
	# else:
	# 	r = requests.get(settings.RUMBLEFISH_SERVER+'occasion?id='+str(id), data={})
	# # print settings.RUMBLEFISH_SERVER_JP+'occasion?id='+str(id)+'&source='+settings.RUMBLEFISH_SOURCE
	# e = r.json
	# f = e['occasion']['children']
	# for g in f:
	# 	h = g['children']
	# 	for i in h:
	# 		ids = i['id']

	# 		print("Ids"+ids)


	if int(id) not in [19, 22, 23, 24, 25, 26, 27, 32, 30 , 31, 33]:
		ss = requests.get(settings.RUMBLEFISH_SERVER+'occasion?id='+str(id), data={})
	else:
		ss = requests.get(settings.RUMBLEFISH_SERVER_JP+'occasion?id='+str(id)+'&source='+settings.RUMBLEFISH_SOURCE, data={})
	j = ss.json
	pid = j['occasion']['playlists'][0]['id']
	if int(id) not in [19, 22, 23, 24, 25, 26, 27, 32, 30 , 31, 33]:
		sp = requests.get(settings.RUMBLEFISH_SERVER+'playlist?id='+str(pid), data={})
		media = sp.json['playlist']['media']
	else:
		sp = requests.get(settings.RUMBLEFISH_SERVER_JP+'playlist?id='+str(pid)+'&source='+settings.RUMBLEFISH_SOURCE, data={})
		media = sp.json['media']
	for k in media:
		album = {}
		album['id'] = k['id']
		album['title'] = k['title']
		album['artist'] = k['artists'][0]['name']
		album['preview_url'] = k['preview_url']
		album['duration'] = ':'.join(str(datetime.timedelta(seconds=k['duration'])).split(':')[1:])
		rumblefish_playlist.append(album)
	rumblefish_playlist.sort(key=lambda a:(a['title']))
	return render_to_response('rumblefish_playlist.html',{'rumblefish_playlist':rumblefish_playlist},context_instance=RequestContext(request))

def check_total_size(request):
	size = 0
	createmovie = CreateMovie.objects.filter(user_id=request.session['userid'], session_id=request.COOKIES['sessionid'])
	for movie in createmovie:
		size = size + movie.size
	return HttpResponse(size)

@csrf_exempt
def testing_upload(request, id=None):
	if request.method == 'POST':
		# uploaded = request.read
		# filesize = int(uploaded.im_self.META["CONTENT_LENGTH"])
		# # print uploaded(filesize)
		# print filesize
		filename = request.POST['Filename']
		incoming_file = request.FILES['Filedata']
		f = open(filename, 'wb')
		for chunk in incoming_file.chunks():
			f.write(chunk)
		f.close()
		print request.FILES['Filedata']
		# print request.POST['Upload']
	return render_to_response('testing-upload.html', {}, context_instance=RequestContext(request))

def checkuserfb(request):

	if request.GET:
		request.session['userid'] = request.GET['id']
		request.session['username'] = request.GET['email']

	return HttpResponseRedirect(reverse('video'))


def video(request,uuid):
	url = "%sgallery/" % (settings.SERVER)
	new_payload = {}
	title= ""
	new_payload['return_style'] = 'json'

	try:
		username = request.session['username']
		cookies =  UploadCookie.objects.get(username=username)
		cookie = pickle.loads(str(cookies.cookie))
	except KeyError:
		loggedIn = False
		# username = 'anonymous@hcam.com'
		# # password = '123'
		# url = "%siphone/login/" % (settings.SERVER)
		# payload = {}
		# payload['username'] = username
		# payload['password'] = '123'
		# payload['email'] = username
		# req = requests.post(url,data=payload)
		# res = json.loads(str(req.text))
		# if req.status_code == 200 and res['logged-in']:
		# 	cookie = req.cookies
	url = "%sfriend_gallery/" % (settings.SERVER)
	r = requests.post(url,cookies=cookie, data=new_payload)
	print dir(r)
	print r.content
	new_result_dict = json.loads(r.text)
	title = None
	for i in new_result_dict:
		if i['uuid']==uuid:
			title=i['title']
	if not title:
		url = "%sfriend_gallery/" % (settings.SERVER)
		payload = {} 
		r2 = requests.post(url, data = payload, cookies = cookie)
		t_result_dict = json.loads(r2.text)
		for i in t_result_dict:
			if i['uuid']==uuid:
				title=i['title']
	thumbnail =  settings.PREVIEW_URL + uuid + '.jpg'
	video = settings.VIDEO_SERVER + uuid + '.mp4'


	url = "%sregister_view_of_video/" % (settings.SERVER)
	payload = {}
	payload['uuid'] = uuid
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	views = result_dict['views']


	""" showing comments for a particular video """ 

	url = "%scomments/%s/" % (settings.SERVER, uuid)
	r3 = requests.get(url, cookies= cookie)
	result_dict = json.loads(r3.text)
	print result_dict
	comments = []
	for res in result_dict:
		dct = res['content']
		comments.append(dct['text'])



	""" getting users videos """
	movies = []
	new_result_dict_length=len(new_result_dict)
	random_video_index_list=[]
	print new_result_dict_length
	if not new_result_dict_length == 0:
		while(len(random_video_index_list)!=3):
			random_video_index=random.randrange(new_result_dict_length)
			if(random_video_index not in random_video_index_list):
				random_video_index_list.append(random_video_index)

		for i in random_video_index_list:
			res=new_result_dict[i]
			movie = {}
			movie['thumbnail_url'] = res['preview_url']
			movie['title'] = res['title']
			movie['width'] = 206#res['resolution'].split('x')[0]
			movie['height'] = 116#res['resolution'].split('x')[1]
			movie['source_url'] = res['source_url']
			movie['uuid'] = res['uuid']
			movies.append(movie)
			
	return render_to_response('player1.html', {'fbChannelUrl':settings.FACEBOOK_APP_CHANNEL,'fbAppID':settings.FACEBOOK_APP_ID,'thumbnail':thumbnail,'video':video,'title':title,'uuid':uuid,'views':views,'comments':comments,'movies':movies,'username':username},)


def feed(request):

	username = request.session['username']
	uploadcookie = UploadCookie.objects.get(username=username)

	""" showing users videos """

	url = "%sgallery/" % (settings.SERVER)
	cookie = pickle.loads(str(uploadcookie.cookie))
	payload = {}
	payload['return_style'] = 'json'
	r = requests.post(url,cookies=cookie, data=payload)
	result_dict = json.loads(r.text)
	# print result_dict
	movies = []
	
	""" showing friends videos """

	url = "%sfriend_gallery/" % (settings.SERVER)
	payload = {} 
	r2 = requests.post(url, data = payload, cookies = cookie)
	result_dict = json.loads(r2.text)
	# print result_dict
	for res in result_dict:
		friends_movie = {}
		friends_movie['thumbnail_url'] = res['preview_url']
		friends_movie['title'] = res['title']
		# friends_movie['width'] = 300
		# friends_movie['height'] = 200
		friends_movie['source_url'] = res['source_url']
		friends_movie['uuid'] = res['uuid']
		friends_movie['views'] = res['view_count']

		url = "%scomments/%s/" % (settings.SERVER, friends_movie['uuid'])
		r3 = requests.get(url, cookies= cookie)
		result_dict = json.loads(r3.text)
		# print result_dict
		comments = []
		for res in result_dict:
			dct = res['content']
			comments.append(dct['text'])
		comments.reverse()
		friends_movie['comments'] = comments
		friends_movie['total_comments'] = len(result_dict)

		movies.append(friends_movie)
	return render_to_response('feedpage.html', {'movies':movies,'username':username},)

@csrf_exempt
def postcomment(request):
	username = request.session['username']
	uploadcookie = UploadCookie.objects.get(username=username)
	cookie = pickle.loads(str(uploadcookie.cookie))
	uuid = request.POST['uuid']
	comment = request.POST['comment']
	url = "%scomments/%s/" % (settings.SERVER, uuid)
	payload = {'comment': comment}
	r2 = requests.post(url, data = payload, cookies = cookie)
	return HttpResponse()


@csrf_exempt
def share(request):
	if request.method == 'POST':
		username = request.session['username']
		uploadcookie = UploadCookie.objects.get(username=username)
		cookie = pickle.loads(str(uploadcookie.cookie))
		uuid = request.POST['uuid']
		payload = {}
		payload['uuid'] = uuid
		payload['share_type'] = 'All'
		url = "%sshare_video/" % (settings.SERVER)
		r = requests.post(url, data=payload, cookies=cookie)
		result_dict = json.loads(r.text)
		print result_dict
		if result_dict['now_shared']:
			return HttpResponse("shared successfully")
		else:
			return HttpResponse("something went wrong")

def xdserve(request):
	return render_to_response('xd_receiver.html')

@csrf_exempt
def comment(request, uuid):
	if request.method == 'POST':
		action = request.POST['action']
		current = int(request.POST['current'])
		next = current + 6
		username = request.session['username']
		uploadcookie = UploadCookie.objects.get(username=username)
		cookie = pickle.loads(str(uploadcookie.cookie))
		url = "%scomments/%s/" % (settings.SERVER, uuid)
		r3 = requests.get(url, cookies= cookie)
		result_dict = json.loads(r3.text)
		# print result_dict
		comments = []
		for res in result_dict:
			dct = res['content']
			comments.append(dct['text'])
		comments.reverse()
		return render_to_response('show_comment.html', {'current':current, 'next':next,'comments':comments, 'uuid':uuid, 'action':action}, )

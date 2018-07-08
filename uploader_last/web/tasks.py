import os
import envoy
from celery.task import task
import requests
import json
import pickle
import hashlib

from django.conf import settings

from web.S3_upload import upload_file
from web.models import Upload, UploadList, UploadCookie, CreateMovie

@task
def s3cmd_upload(cmd, file_path):
	print "work from queue started execution..."
	r = envoy.run(cmd)
	print r.std_out
	if r.status_code == 0:
		save_to_db(os.path.basename(file_path))
		print "removing file from server..."
		os.remove(file_path)
		print "file removed from server..."
	else:
		print "error while uploading to s3..."
		print r.std_err

@task
def s3cmd_boto_upload(path, bucket, s3_filename=None, userid=None, username=None, sessionid=None):
	print "work from queue started execution..."
	user = '.'.join(username.split('@'))
	filename = '.'.join(s3_filename.split('.')[:-1])
	extension = s3_filename.split('.')[-1]
	name = hashlib.sha224(filename).hexdigest()
	final_name = '.'.join([name, extension])
	upload_file(path, bucket, s3_filename=final_name, user=user)
	if os.path.exists(path):
		upload = save_to_db(final_name, userid, user)
		process = process_upload(upload, userid, username)
		createmovie = add_to_create_movie(upload, process, sessionid)
		print "removing file from server..."
		os.remove(path)
		if os.path.exists(path+'.png'):
			os.remove(path+'.png')
		print "file removed from server..."
		result = {}
		result['id'] = createmovie.id
		result['thumbnail'] = upload.thumbnail
		return json.dumps(result)
	print "execution completed..."

@task
def upload_audio(path, bucket):
	print "uploading audio..."
	folder = hashlib.sha224(os.path.basename(path)).hexdigest()
	cmd = "s3cmd put "+str(path)+" s3://"+str(bucket)+"/" + folder + "/"+str(os.path.basename(path))+" --guess-mime-type --multipart-chunk-size-mb=10 --acl-public"
	r = envoy.run(cmd)
	print "audio upload command executed..."
	if r.status_code == 0:
		if os.path.exists(path):
			os.remove(path)
			print "audio file removed from server..."
		print "audio uploaded successfully..."
		result = {}
		# result['url'] = 'https://s3.amazonaws.com/' + settings.S3_BUCKET + "/" + folder + "/" + str(os.path.basename(path))
		result['url'] = 'http://'+settings.S3_BUCKET +'.s3.amazonaws.com' + "/" + folder + "/" + str(os.path.basename(path))
		result['relative_url'] = folder + "/" + str(os.path.basename(path))
		return json.dumps(result)

def save_to_db(filename, userid, user):
	upload = Upload()
	upload.title = filename
	# upload.url = 'https://s3.amazonaws.com/' + settings.S3_BUCKET + '/' + user + '/' + filename
	upload.url = 'http://'+settings.S3_BUCKET +'.s3.amazonaws.com/' + user + '/' + filename
	upload.user_id = userid
	# upload.thumbnail = 'https://s3.amazonaws.com/' + settings.S3_BUCKET + '/' + user + '/thumbnail/' + filename + '.png'
	upload.thumbnail = 'http://'+settings.S3_BUCKET +'.s3.amazonaws.com/' + user + '/thumbnail/' + filename + '.png'
	upload.save()
	return upload

def process_upload(upload, userid, username):
	url = "%supload_success/" % (settings.SERVER)
	uploadlist = UploadList()
	uploadlist.username = username
	uploadlist.user_id = userid
	uploadlist.url = upload.url
	payload = {}
	payload['return_style'] = 'json'
	payload['video'] = upload.url
	payload['keep_seconds'] = 2
	uploadcookie = UploadCookie.objects.get(username=username)
	cookie = pickle.loads(str(uploadcookie.cookie))
	r = requests.post(url, cookies=cookie, data=payload)
	print r.status_code
	result_dict = json.loads(r.text)
	uploadlist.uuid = result_dict['highlight_uuid']
	uploadlist.upload = upload
	print uploadlist.uuid
	uploadlist.save()
	return uploadlist

def add_to_create_movie(upload, process_upload, sessionid):
	'''
		upload is the object of Upload class, process_upload is the object of UploadList
	'''
	createmovie = CreateMovie()
	createmovie.user_id = upload.user_id
	createmovie.session_id = sessionid
	createmovie.uuid = process_upload.uuid
	createmovie.thumbnail = upload.thumbnail
	createmovie.title = upload.title
	createmovie.size = upload.get_size()
	createmovie.save()
	return createmovie
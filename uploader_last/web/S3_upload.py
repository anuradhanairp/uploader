
import os
import time
import random
import pprint
import traceback
import multiprocessing 
from multiprocessing.pool import IMapIterator
# import formatstring 
import functools
import boto
import subprocess
import contextlib
import glob

from boto.s3.connection import S3Connection
from boto.s3.key import Key
import os 
import envoy
# from mailgunMessage import send_mail
# from helperFunctions import get_instance_information
from django.conf import settings

# conn = S3Connection('19196Q8FWVPW2YABMQG2', 'att983bOkH60aAUBCFFHWOrZ4hMNJDJEA4DMcO8K')
conn = S3Connection(settings.AWS_ACCESS_KEY, settings.AWS_SECRET_KEY)

# s3_awsKey = '19196Q8FWVPW2YABMQG2' #-s
# s3_secretKey = 'att983bOkH60aAUBCFFHWOrZ4hMNJDJEA4DMcO8K' #-a
default_threads = 2*(multiprocessing.cpu_count() + 1)
timeoutSeconds = 60*30 #an hour
 
from helperFunctions import get_instance_information



##bucket = conn.create_bucket('highlightcam.com',location='us-west-1')
##bucket = conn.get_bucket('highlightcam.com')

##bucket.set_acl('public-read')

def emergency_upload(key, path, headers):
	# this_conn = S3Connection('19196Q8FWVPW2YABMQG2', 'att983bOkH60aAUBCFFHWOrZ4hMNJDJEA4DMcO8K')
	this_conn = S3Connection(settings.AWS_ACCESS_KEY, settings.AWS_SECRET_KEY)
	this_bucket = this_conn.get_bucket(key.bucket.name)
	this_key = Key(this_bucket)
	this_key.key = key.name  ### Is this needed for anything?
	this_key.set_contents_from_filename(path, headers=headers)
	this_key.set_acl('public-read')
	return this_key


def get_or_create_bucket(name, permission='private', location=''):
	try:
		bucket = conn.get_bucket(name)
	except Exception, value:
##        print type(value), vars(value)
		bucket = conn.create_bucket(name, location=location)
		bucket.set_acl(permission)
	return bucket

def upload_file(path, bucket, s3_filename=None, user=None, retries=8, headers=None, graceful_errors=True):
	"""s3_filename used in preference to original, if given"""
	if s3_filename:
		name = s3_filename
	else:
		name = os.path.basename(path)
	b = get_or_create_bucket(bucket)
	k = Key(b)
	k.key = '/'.join([str(user), name])
	print k.key
	
	if not os.path.exists(path):
		print path, "not found; unable to upload"
		if not graceful_errors:
			raise ValueError("Path not found for uploading", path)
	else:
		retry = 0
		useBoto = True 
		if os.path.getsize(path) >  1024*1024*5:  #beware filesize buffers http://stackoverflow.com/questions/1013778/python-file-size ... should not be an issue if filehandle is closed
			 ### This upload method doesn't respect the s3_filename argument
			 # r = envoy.run("s3funnel %s -s %s %a %s -t %s -i %s --put-only-new --put-acl=public-read" % (bucket, s3_awsKey, s3_secretKey, timeoutSeconds, default_threads, path))
			 ########
			 cmd = "s3cmd put "+str(path)+" s3://"+str(bucket)+"/"+str(user)+"/"+str(s3_filename)+" --guess-mime-type --multipart-chunk-size-mb=10 --acl-public"
			 print cmd
			 r = envoy.run(cmd)
			 print r.std_err
			 print r.std_out
			 thumb_cmd = "s3cmd put "+str(path+'.png')+" s3://"+str(bucket)+"/"+str(user)+"/thumbnail/"+str(s3_filename+'.png')+" --guess-mime-type --acl-public"
			 s = envoy.run(thumb_cmd )
			 if r.status_code == 0: 
				useBoto = False
			 else:
				#construct mail to send
				iInfo = get_instance_information()
				errorDict = dict()
				errorDict["instanceID"] = iInfo[0] 
				errorDict["publicHostname"] = iInfo[1]
				errorDict["availability-zone"] = iInfo[2]
				######
				### locals() isn't a string, but send_mail probably requires a string
				# send_mail(subject="s3_upload error %s %s" % (errorDict["availability-zone"],errorDict["publicHostname"]), body=formatstring.format(**locals()), sender="s3uploader@hlcam.com", recepientList=["serverDEV01_hlcam@swamig.mailgun.com","mokelly@hlcam.com"] )
				# put an email there
				#sqs message .... downloader 
		### useBoto == False will trigger the 'else' branch here, which is not desired
		while useBoto and (retries==0 or retry < retries):
			retry += 1
			if retry > 1:
				print "Try", retry, "uploading", path
			try:
				mb_size = os.path.getsize(path) / 1e6
				use_rr = True
				if mb_size < 10:
					print "size less than 10"
					print k.key
					k.set_contents_from_filename(path, headers=headers)
					k.set_acl('public-read')
				else:
					res = multipart_upload(b, name, path, mb_size, use_rr)
					if not res:
						raise Exception('boto multipart error')
				thumb_cmd = "s3cmd put "+str(path+'.png')+" s3://"+str(bucket)+"/"+str(user)+"/thumbnail/"+str(s3_filename+'.png')+" --guess-mime-type --acl-public"
				s = envoy.run(thumb_cmd)
				print s.status_code
				break
			except Exception, value:
				print type(value), vars(value), value.message
				time.sleep(1.0 + random.random())
		else:
			if useBoto: # If retry max is reached, value is known
				try:
					print "Trying emergency upload"
					k = emergency_upload(k, path, headers)
					thumb_cmd = "s3cmd put "+str(path+'.png')+" s3://"+str(bucket)+"/"+str(user)+"/thumbnail/"+str(s3_filename+'.png')+" --guess-mime-type --acl-public"
					s = envoy.run(thumb_cmd)
				except Exception, value2:
					print pprint.pformat(value2), traceback.format_exc()
					print "Maximum retries reached for", path, "; giving up"
					if not graceful_errors:
						print pprint.pformat(value), traceback.format_exc()
						raise value
	return k

def upload_video_row(video):
	if not video.s3_key:
		path = video.video_file
		k = upload_file(path)
		url = k.generate_url(1000000000, query_auth=False)
		video.s3_key = url
		video.save()

def download_file(path, filename, bucket):
	"""Download filename from S3 bucket to indicated path"""
	k = Key(bucket)
	k.key = filename
	k.get_contents_to_filename(path)

def download_file_with_key(path, key):
	"""Return True if file found at key, False otherwise"""
	file_found = key.exists()
	if file_found:
		key.get_contents_to_filename(path)
	return file_found

def generate_key_for_filename(filename, bucket):
	k = Key(bucket)
	k.key = filename
	return k

def multipart_upload(bucket, filename, path, mb_size, use_rr=True):
	cores = multiprocessing.cpu_count()

	# def split_file(in_file, mb_size, split_num=5):
	# 	prefix = os.path.join(os.path.dirname(in_file),
	# 						  "%sS3PART" % (os.path.basename(filename)))
	# 	split_size = int(min(mb_size / (split_num * 1.0), 250))
	# 	if not os.path.exists("%saa" % prefix):
	# 		cl = ["split", "-b%sm" % split_size, in_file, prefix]
	# 		subprocess.check_call(cl)
	# 	return sorted(glob.glob("%s*" % prefix))

	try:
		print "inside multipart"
		mp = bucket.initiate_multipart_upload(filename)
		os.chdir(os.path.join(settings.PROJECT_ROOT, 'file_part'))
		print "changed to folder file_part"
		# with multimap(cores) as pmap:
		# 	for _ in pmap(transfer_part, ((mp.id, mp.key_name, mp.bucket_name, i, part)
		# 								  for (i, part) in
		# 								  enumerate(split_file(path, mb_size, cores)))):
		# 		pass
		multipart_files = split_file(path, filename)
		# os.chdir(os.path.join(settings.PROJECT_ROOT, 'file_part'))
		for i, part in enumerate(multipart_files):
			transfer_part(mp.id, filename, bucket, i, part)
		mp.complete_upload()
		os.chdir(settings.PROJECT_ROOT)
		return 1
	except:
		return 0

def split_file(path, filename):
	try:
		print "inside splitfile"
		prefix = "%sS3PART" % (filename)
		split_size = 5
		os.chdir(os.path.join(settings.PROJECT_ROOT, 'file_part'))
		if not os.path.exists("%saa" % prefix):
			cl = ["split", "-b%sm" % split_size, path, prefix]
			subprocess.check_call(cl)
		print "file splitted"
		files = sorted(glob.glob("%s*" % prefix))
		os.chdir(settings.PROJECT_ROOT)
		return files
	except Exception as e:
		print e

def map_wrap(f):
	@functools.wraps(f)
	def wrapper(*args, **kwargs):
		return apply(f, *args, **kwargs)
	return wrapper

# @map_wrap
def transfer_part(mp_id, mp_keyname, mp_bucketname, i, part):
	try:
		os.chdir(os.path.join(settings.PROJECT_ROOT, 'file_part'))
		mp = mp_from_ids(mp_id, mp_keyname, mp_bucketname)
		print " Transferring", i, part
		with open(part) as t_handle:
			mp.upload_part_from_file(t_handle, i+1)
		os.remove(part)
		os.chdir(settings.PROJECT_ROOT)
	except Exception as e:
		print e

def mp_from_ids(mp_id, mp_keyname, mp_bucketname):
	conn = S3Connection(settings.AWS_ACCESS_KEY, settings.AWS_SECRET_KEY)
	bucket = conn.lookup(mp_bucketname)
	mp = boto.s3.multipart.MultiPartUpload(bucket)
	mp.key_name = mp_keyname
	mp.id = mp_id
	return mp

@contextlib.contextmanager
def multimap(cores=None):
	"""Provide multiprocessing imap like function.

	The context manager handles setting up the pool, worked around interrupt issues
	and terminating the pool on completion.
	"""
	print "inside multimap..."
	try:
		if cores is None:
			cores = max(multiprocessing.cpu_count() - 1, 1)
		def wrapper(func):
			def wrap(self, timeout=None):
				return func(self, timeout=timeout if timeout is not None else 1e100)
			return wrap
		IMapIterator.next = wrapper(IMapIterator.next)
		pool = multiprocessing.Pool(cores)
		print "multimap yield..."
		yield pool.imap
		pool.terminate()
	except Exception as e:
		print e
		pass
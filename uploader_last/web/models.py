import envoy, re
from datetime import datetime

from django.db import models
from django.conf import settings

# Create your models here.
class Upload(models.Model):
	'''
		Details of the uploaded file
	'''
	title = models.CharField(max_length=150)
	url = models.CharField(max_length=128)
	uploaded = models.DateTimeField()
	thumbnail = models.CharField(max_length=200, null=True, blank=True)
	user_id = models.IntegerField()

	def save(self):
		self.uploaded = datetime.now()
		models.Model.save(self)

	def __unicode__(self):
		return self.title

	def get_size(self):
		cmd = "s3cmd info s3://"+settings.S3_BUCKET+'/'+'/'.join(self.url.split('/')[-2:])
		print cmd
		r = envoy.run(str(cmd))
		print r.status_code
		if r.status_code == 0:
			match = re.search(r'File size: (\d+)\n', r.std_out)
			return int(round(int(match.group(1)) / 1e6))
		else:
			return 0


class UploadCookie(models.Model):
	'''
		Model for saving cookie
	'''
	username = models.CharField(max_length=50)
	cookie = models.TextField()

class UploadList(models.Model):
	'''
		Model for saving uploaded file details which are known to api server
	'''
	username = models.CharField(max_length=50)
	url = models.URLField(max_length=200)
	user_id = models.CharField(max_length=25)
	uuid = models.CharField(max_length=50)
	upload = models.ForeignKey(Upload)
	saved = models.DateTimeField()

	def save(self):
		self.saved = datetime.now()
		models.Model.save(self)

	def __unicode__(self):
		return self.upload.title

class RenderedVideo(models.Model):
	'''
		Model to save the details of rendered video
	'''
	username = models.CharField(max_length=50)
	user_id = models.IntegerField()
	uuid = models.CharField(max_length=50)
	url = models.URLField(max_length=200)

	def __unicode__(self):
		return self.url

class CreateMovie(models.Model):
	'''
		Model to save the video ang image uuid for creating a movie
	'''
	user_id = models.IntegerField()
	session_id = models.CharField(max_length=60)
	uuid = models.CharField(max_length=50)
	thumbnail = models.CharField(max_length=200, null=True, blank=True)
	title = models.CharField(max_length=150)
	size = models.IntegerField()

	def __unicode__(self):
		return self.title
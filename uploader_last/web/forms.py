import requests
import json

from django import forms
from django.forms.widgets import CheckboxSelectMultiple
from django.conf import settings

from web.models import UploadList, Upload

class UploadForm(forms.Form):
	title = forms.CharField(max_length=50)
	file = forms.FileField()


class ProcessUploadForm(forms.Form):
	# url = forms.URLField(max_length=200)
	caption = forms.CharField(max_length=50, required=False)
	animation_duration = forms.IntegerField(required=False)
	width = forms.IntegerField(required=False)
	height = forms.IntegerField(required=False)
	transform = forms.CharField(max_length=50, required=False)
	text_overlay = forms.CharField(max_length=50, required=False)
	text_color = forms.CharField(max_length=10, required=False)
	background_color = forms.CharField(max_length=10, required=False)
	quality = forms.CharField(max_length=15, required=False)
	name = forms.CharField(max_length=20, required=False)

	def __init__(self, userid=None, *args, **kwargs):
		super(ProcessUploadForm, self).__init__(*args, **kwargs)
		# self.fields['files'] = forms.ChoiceField(choices=[(upload.id, upload.upload.title) for upload in VDCModel.objects.all()])
		# print args[0]
		self.fields['url'] = forms.ChoiceField(choices=[(upload.url, upload.url) for upload in Upload.objects.filter(user_id=userid)])


class RenderForm(forms.Form):
	# FILTER_CHOICES = (
	# 		(json.dumps({'a':'abc', 'b':'bcd'}), 'Change Theme'), 
	# 		('blackwhite', 'Black&White'),
	# 		('old_movie', 'Old Movie'),
	# 		('cartoon', 'Cartoon'),
	# 		('Package_Birthday_new', 'Package Birthday New')
	# 	)

	def get_filter_choices():
		choices = []
		url = "%sapp_startup/" % (settings.SERVER)
		r = requests.post(url)
		filter = r.json['filter_groups']
		for f in filter:
			if f['restrictions'] == 'none':
				for x in f['filters']:
					# choices.append([])
					value = {}
					value['call_name'] = x['call_name']
					value['example_url'] = x['example_url']
					value['thumbnail_url'] = x['thumbnail_url']
					choices.append((json.dumps(value), x['display_name']))
		return choices
	
	FILTER_CHOICES = get_filter_choices()

	DEFAULT_CHOICE = {}
	DEFAULT_CHOICE['thumbnail_url'] = '/site_media/images/film.png'
	DEFAULT_CHOICE['example_url'] = "/site_media/images/film.png"
	DEFAULT_CHOICE['call_name'] = ''

	FILTER_CHOICES.insert(0, (json.dumps(DEFAULT_CHOICE), 'Change Theme'))

	QUALITY_CHOICES = (
			('', 'None'),
			('balanced', 'Balanced'),
		)

	DURATION_CHOICES = (
			('', 'None'),
			(30, 30),
		)

	FIT_CHOICES = (
			('', 'None'),
			(1, 1),
		)

	# name = forms.CharField(max_length=25)
	filter = forms.ChoiceField(choices=FILTER_CHOICES, widget=forms.Select(attrs={'class':'id_filter'}))
	quality = forms.ChoiceField(choices=QUALITY_CHOICES)
	target_duration = forms.ChoiceField(choices=DURATION_CHOICES)
	fit_duration = forms.ChoiceField(choices=FIT_CHOICES)
	title = forms.CharField(max_length=50, initial='Movie Title')

	def __init__(self, userid=None, *args, **kwargs):
		super(RenderForm, self).__init__(*args, **kwargs)
		self.userid = userid
		# self.fields['files'] = forms.ChoiceField(choices=[(upload.id, upload.upload.title) for upload in VDCModel.objects.all()])
		# print args[0]
		self.fields['files'] = forms.MultipleChoiceField(widget=CheckboxSelectMultiple, choices=[(upload.id, upload.upload.title) for upload in UploadList.objects.filter(user_id=userid)])
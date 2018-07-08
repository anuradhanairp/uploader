import json

from django import template

register = template.Library()

def strip_title(value):
	"""
		strips the title so that it'll fit into the title pane
	"""
	if len(value) > 20:
		return value[:20]
	else:
		return value

register.filter('strip_title', strip_title)

def strip_feed_title(value):
	"""
		strips the title so that it'll fit into the title pane
	"""
	if len(value) > 13:
		return value[:13]
	else:
		return value

register.filter('strip_feed_title', strip_feed_title)

def strip_rumblefish_title(value):
	"""
		strips the rumblefish title so that it'll fit into the title pane
	"""
	if len(value) > 28:
		return value[:28]
	else:
		return value

register.filter('strip_rumblefish_title', strip_rumblefish_title)

def derive_thumb_url(value):
	theme = json.loads(value)
	return theme['thumbnail_url']

register.filter('derive_thumb_url', derive_thumb_url)

def replace(value):
	value = value.replace(':', '%3A').replace('/','%2F')
	return value

register.filter('replace', replace)
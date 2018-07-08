# Django settings for uploader project.
import os

DEBUG = True
TEMPLATE_DEBUG = DEBUG

PROJECT_ROOT = os.path.dirname(__file__)

ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES = {
   'default': {
       'ENGINE': 'django.db.backends.mysql', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
       'NAME': 'highlightcam',                      # Or path to database file if using sqlite3.
       'USER': 'root',                      # Not used with sqlite3.
       'PASSWORD': 'newpwd',                  # Not used with sqlite3.
       'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
       'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
   }
}

# DATABASES = {
#      'default': {
#          'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
#          'NAME': os.path.join(PROJECT_ROOT, 'upload.db'),                      # Or path to database file if using sqlite3.
#          'USER': '',                      # Not used with sqlite3.
#          'PASSWORD': '',                  # Not used with sqlite3.
#          'HOST': '',                      # Set to empty string for localhost. Not used with sqlite3.
#          'PORT': '',                      # Set to empty string for default. Not used with sqlite3.
#      }
# }

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = os.path.join(PROJECT_ROOT, 'media')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = '/site_media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# URL prefix for admin static files -- CSS, JavaScript and images.
# Make sure to use a trailing slash.
# Examples: "http://foo.com/static/admin/", "/static/admin/".
ADMIN_MEDIA_PREFIX = '/static/admin/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '5l!uy)_7qr@c0+*qs&%j+p!m-er5jtjq96oa^7a&s6-f)+33!0'

AWS_ACCESS_KEY = 'AKIAIW3ZLODZOFBDSKWQ'

AWS_SECRET_KEY = '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'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)


TEMPLATE_CONTEXT_PROCESSORS = (
    'django_facebook.context_processors.facebook',
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    #'django.core.context_processors.tz',
    'django.contrib.messages.context_processors.messages',
)


MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'uploader_last.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_ROOT, 'templates'),
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    # 'django_beanstalkd',
    'djcelery',
    'web',
    'django_facebook',

)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

FILE_UPLOAD_TEMP_DIR = os.path.join(PROJECT_ROOT, 'temp')

FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760

S3_BUCKET = 'uploads.highlightcam'

UPLOADIFY_PATH = os.path.join(MEDIA_ROOT, 'js/uploadify')

UPLOADIFY_UPLOAD_PATH = os.path.join(PROJECT_ROOT, 'upload')

# My beanstalkd server
# BEANSTALK_SERVER = '127.0.0.1:8000'  # the default value

# BEANSTALK_JOB_NAME = '%(app)s.%(job)s'

import djcelery
djcelery.setup_loader()

BROKER_URL = "beanstalk://localhost:11300"

#SERVER = "http://test.highlightcam.com/"
SERVER = "http://127.0.0.1:8000/"


#VIDEO_SERVER = "http://d2vqfdt3gromqf.cloudfront.net/video_"

THUMBNAIL_URL = "http://thumbnailimage.highlightcam.s3.amazonaws.com/thumbnail_image_"

PREVIEW_URL = "http://previewimage.highlightcam.s3.amazonaws.com/preview_image_"

#RUMBLEFISH_SERVER = "http://test.highlightcam.com/music_store/"

#RUMBLEFISH_SERVER_JP = "http://jp.highlightcam.com/music_store/"

RUMBLEFISH_SOURCE = 'japan'

KEEP_LOGGED_DURATION = 31

try:
    from local_settings import *
except:
    pass

AUTHENTICATION_BACKENDS = (
    'django_facebook.auth_backends.FacebookBackend',
    'django.contrib.auth.backends.ModelBackend',
)

AUTH_PROFILE_MODULE = 'django_facebook.FacebookProfile'

FACEBOOK_APP_ID = 407011216011933
FACEBOOK_APP_CHANNEL = "http://highlightcam.com/facebook/channel"
FACEBOOK_APP_SECRET = 'da65bbbeb1d811c4fd258a9f7900bf32'


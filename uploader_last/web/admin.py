from django.contrib import admin
from web.models import Upload, UploadCookie, UploadList, RenderedVideo, CreateMovie

admin.site.register(Upload)
admin.site.register(UploadCookie)
admin.site.register(UploadList)
admin.site.register(RenderedVideo)
admin.site.register(CreateMovie)
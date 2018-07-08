try:
    import json
except ImportError:
    import simplejson as json

import urllib2
import urllib
import base64




#https://api.mailgun.net/v2
#API Key : key-82dy9qqq824rqz27p8
MAILGUN_API_KEY = "key-82dy9qqq824rqz27p8"
MAILGUN_BASE = "https://api.mailgun.net/v2/%(email_domain)s/%(api_endpoint)s"
MAILGUN_ENDPOINT = "messages"
EMAIL_DOMAIN = "hlcam.com"


def post_message_urllib(inputDict,api_base=MAILGUN_BASE,email_domain=EMAIL_DOMAIN,api_endpoint=MAILGUN_ENDPOINT,api_key=MAILGUN_API_KEY):
    target = api_base%{"email_domain":email_domain,"api_endpoint":api_endpoint}
    data = urllib.urlencode(inputDict)
    request = urllib2.Request(target)
    request.add_data(data)
    base64string = base64.encodestring('%s:%s' % ('api', api_key))[:-1]
    request.add_header("Authorization", "Basic %s" % base64string)

    try:
        handle = urllib2.urlopen(request)
    except IOError, e:
        return "Bad authentication, probably"
    return handle.read()



def send_mail(subject="HighlightCam Notification",message="", from_email="support@hlcam.com",recipient_list=['support@hlcam.com']):

    mailDict = dict()
    mailDict['to']          = ",".join(recipient_list)
    mailDict['from']        = from_email
    mailDict['subject']     = subject
    mailDict['text']        = message
    mailDict['o:tracking']  = "no"
    mailDict['o:campaign']  = "hlcamAPIServer"

    #put a try here
    r = post_message_urllib(mailDict)
    #except fail... send the message through django sendmail


    return r

#from django.core.mail import send_mail

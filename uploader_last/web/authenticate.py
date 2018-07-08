import pickle
import requests
import ast
import json
from datetime import timedelta

from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.template import RequestContext
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from web.models import UploadCookie
from web.decorators import logged_in
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login


def cookieCheckHelper(request):
    try:
        if request.session['userid']:
            #return HttpResponseRedirect(reverse('library'))
            login_message="true"
    except KeyError:
        pass
    # if request.method == 'GET':
    #     response = render_to_response('login.html', {}, context_instance=RequestContext(request))
    #     return response
    try:
        if "fbemail" in request.POST:
             email = request.POST["fbemail"]
        else: email = request.POST["email"]
        UploadCookie.objects.get(username=email).delete()
    except ObjectDoesNotExist:
        pass

def cookieUpdateProtocol(api_response,email,r,request):
	login_message=""
	if r.status_code == 200 and api_response['logged-in']:
		
        #response = HttpResponseRedirect(reverse('library'))
        #saving the cookie to db
    
		#request.session['userid'] = api_response['user-id']
		request.session['username'] = email
		cookie = UploadCookie()
		cookie.username = request.session['username']
		cookie.cookie = pickle.dumps(r.cookies)
		cookie.save()
		url = "%sv2/getUserId" % (settings.SERVER)
		re = requests.get(url,cookies=r.cookies)
		request.session['userid'] = re.text
		login_message="true"
	else:
		login_message="false"
		#return HttpResponseRedirect(reverse('home'))
		#response = render_to_response('home-new.html', {'login_message':login_message}, context_instance=RequestContext(request))
	return login_message

@csrf_exempt
def hlcam_login(request):
    # print request.user.is_authenticated()
	cookieCheckHelper(request)
	url = "%siphone/login/" % (settings.SERVER)
	payload = {}
	payload['username'] = request.POST['email']
	payload['password'] = request.POST['password']
	payload['email'] = request.POST['email']
	print payload
	if request.POST.get('remember', None):
		request.session.set_expiry(timedelta(days=settings.KEEP_LOGGED_DURATION))
		print "clicked..."
	else:
		request.session.set_expiry(0)
	r = requests.post(url,data=payload)
	api_response = json.loads(str(r.text))
	login_message = cookieUpdateProtocol(api_response,request.POST['email'],r,request)
	return HttpResponse(login_message)

@csrf_exempt
def register(request):

	if request.method == 'GET':
		return render_to_response('home-new.html', {}, context_instance=RequestContext(request))
	url = "%siphone/register/" % (settings.SERVER)
	payload = {}
	payload['username'] = request.POST['register_email']
	payload['email'] = request.POST['register_email']
	payload['password1'] = request.POST['password']
	payload['password2'] = request.POST['password']
	r = requests.post(url,data=payload)
	print r.status_code
	print "here"
	result_dict = json.loads(r.text)
	if r.status_code == 200:
		if result_dict["registered"]=="true":
			register_message = result_dict["message"]
		else:
			register_message = result_dict["message"]
	else:
		register_message = "Something went wrong..."
	return HttpResponse(register_message);



@logged_in
def logout(request):
    url = "%siphone/logout/" % (settings.SERVER)
    r = requests.post(url)
    try:
        UploadCookie.objects.get(username=request.session['username']).delete()
        del request.session['username']
        #del request.session['userid']
    except ObjectDoesNotExist:
        del request.session['username']
        #del request.session['userid']
    except KeyError:
        pass
    for sesskey in request.session.keys():
        del request.session[sesskey]
    # except:
    #     del request.session['username']
    return HttpResponseRedirect(reverse('home'))

@csrf_exempt
def fblogin(request):
	url = "%sv2/auth/fb_login/" % (settings.SERVER)
	payload = {}
	print request.POST
	payload['access_token'] = request.POST['access_token']
	payload['fbid'] = request.POST['fbid']
	r = requests.post(url,data=payload)
	result_dict = json.loads(r.text)
	login = result_dict['logged-in']
	if login == False:
		url = "%siphone/register/" % (settings.SERVER)
		password = 'asdf'
		payload = {}
		payload['username'] = request.POST['fbemail']
		payload['email'] = request.POST['fbemail']
		payload['password1'] = password
		payload['password2'] = password
		r = requests.post(url,data=payload)
		
		url = "%sv2/auth/fb_convert/" % (settings.SERVER)
		cookie = r.cookie 
		r = requests.post(url, data = payload, cookies = cookie)
		
		result_dict = json.loads(r.text)
		print result_dict 
		if result_dict["success"] == True:
			cookieCheckHelper(request)
			output = cookieUpdateProtocol(result_dict,request.POST['email'],r,request)
			print "successful facebook convert"
			print output 
			fbusers = Facebookusers()
			fbusers.username = request.POST['email']
			fbusers.password = password
			fbusers.save()
			print "new user registration successful!"
			return HttpResponseRedirect(reverse('feed'))
		else:
			print "print user already exists"
			print "we should probably pass to another page to do error management here"
			return HttpResponseRedirect(reverse('feed'))
	else:
		print "already logged in"
		cookieCheckHelper(request)
		output = cookieUpdateProtocol(result_dict,request.POST['fbemail'],r,request)		
		print output
		return HttpResponseRedirect(reverse('feed'))

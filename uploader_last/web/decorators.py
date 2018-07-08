from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect

def logged_in(fun):
	def new_f(request, id=None):
		try:
			if request.session['userid']:
				if id:
					return fun(request, id)
				return fun(request)
			else:
				return HttpResponseRedirect(reverse('home'))
		except KeyError:
			return HttpResponseRedirect(reverse('home'))
	return new_f
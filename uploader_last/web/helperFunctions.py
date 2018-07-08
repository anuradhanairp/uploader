import urllib

def helper_returnJSON_Response(someDict):
	return HttpResponse(json.dumps(someDict), content_type = 'application/javascript; charset=utf8')


def get_instance_information():
    """Return a tuple with the instance's id,public hostname, and region"""
    return (urllib.urlopen('http://169.254.169.254/2007-01-19/meta-data/instance-id').read().strip(),
            urllib.urlopen('http://169.254.169.254/2007-01-19/meta-data/public-hostname').read().strip(),
            urllib.urlopen('http://169.254.169.254/latest/meta-data/placement/availability-zone').read()[:-1].strip()
        )



import os
import re
import envoy

from django_beanstalkd import beanstalk_job

@beanstalk_job
def s3cmd_upload(arg):
	print "inside the bg process"
	print cmd
	cmd = arg
	r = envoy.run(cmd)
	if r.status_code == 0:
		pattern = r's3cmd put (.*) s3:'
		path = re.match(pattern, cmd)
		if path:
			file_path = path.group(1)
			os.remove(file_path)
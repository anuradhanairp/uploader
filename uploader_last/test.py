import envoy

r = envoy.run("s3cmd put /home/users/shinu/venvs/uploader/uploader/../uploader/upload/sample.mp4 s3://sparkupload1/sample.mp4 --guess-mime-type --multipart-chunk-size-mb=10 --acl-public")

print r.std_out

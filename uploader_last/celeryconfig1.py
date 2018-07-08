BROKER_URL = "beanstalk://localhost:11300"

CELERY_RESULT_BACKEND = "database"

CELERY_RESULT_DBURI = "sqlite:///upload.db"

CELERY_IMPORTS = ("celerybeat.tasks", )
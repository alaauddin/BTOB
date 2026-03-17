import pymysql
import sys

# Fake the mysqlclient version
pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()

# Ensure the module is properly registered in sys.modules
sys.modules["MySQLdb"] = sys.modules["pymysql"]

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)
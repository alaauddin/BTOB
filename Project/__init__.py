import pymysql
import sys

# Fake the mysqlclient version
pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()

# Ensure the module is properly registered in sys.modules
sys.modules["MySQLdb"] = sys.modules["pymysql"]
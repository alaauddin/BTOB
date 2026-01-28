import pymysql

# This line is crucial for Django compatibility
pymysql.version_info = (1, 4, 6, "final", 0) 
pymysql.install_as_MySQLdb()
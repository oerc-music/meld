#!/usr/bin/env python
import os
from app import create_app
from flask.ext.script import Manager
from flask_cors import CORS

app = create_app(os.getenv('FLASK_CONFIG') or 'default')
CORS(app, resources={r"/*": {"origins": "*", "expose_headers": "Location, ETag"}})
manager = Manager(app)


if __name__ == '__main__':
    manager.run()


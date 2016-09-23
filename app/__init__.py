from flask import Flask
from config import config
from flask.ext import assets
from SPARQLWrapper import SPARQLWrapper, JSON, POST

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    env = assets.Environment(app)
    env.url = app.static_url_path
    # where do our SASS files live?
    scss = assets.Bundle('all.scss', filters='pyscss', output='all.css')
    
    env.register('scss_all', scss)

    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app



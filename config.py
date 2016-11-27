import os
basedir = os.path.abspath(os.path.dirname(__file__))
baseuri = os.environ.get('MELD_BASE_URI') or 'http://meld.linkedmusic.org'
meibaseuri = os.environ.get('MELD_MEI_URI') or 'http://meld.linkedmusic.org/mei'


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'iRphLMnnl2kiOHb1EEEl5blL74'
    @staticmethod
    def init_app(app):
        pass


class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True

class ProductionConfig(Config):
    pass

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}


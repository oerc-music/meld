MELD: Music Encoding and Linked Data
====================================
See ISMIR 2017 paper: https://ismir2017.smcnus.org/wp-content/uploads/2017/10/190_Paper.pdf


Installing MELD requirements
----------------------------
* cd server
* pip install -r requirements.txt  #(or use a virtualenv)

Generating Climb compositional fragment semantics (RDF)
-------------------------------------------------------
* cd server
* source set_env.sh
* python generate_climb_scores.py mkGameEngine-meld.json score

Running MELD services
---------------------
* cd server
* source set_env.sh
* python manage.py runserver #(default port: 5000)

Running MELD client 
-------------------
(seeAlso: http://github.com/oerc-music/meld-client)

* git clone git@github.com:oerc-music/meld-client
* cd meld-client
* npm install
* npm start #(default port: 8080)

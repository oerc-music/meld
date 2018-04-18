MELD: Music Encoding and Linked Data
====================================

The MELD implementation is split across a number of different repositories:

* [oerc-music/meld-web-services](https://github.com/oerc-music/meld-web-services), a reference implementation of the session and annotation services providing a server-side implementation of the MELD framework.
* [oerc-music/meld-clients-core](https://github.com/oerc-music/meld-clients-core), a React.js library providing functionalities common to MELD applications, including reusable web page elements, graph traversal actions, rendering and interaction handlers, and state reducers.
* Repositories for several MELD apps.


![MELD Overview](meld-overview.png)


MELD Web Services
-----------------
A reference implementation of the MELD annotation and session web services is available at [oerc-music/meld-web-services](https://github.com/oerc-music/meld-web-services). To install: 

``
git clone git@github.com:oerc-music/meld-web-services
cd meld-web-services
pip install -r requirements.txt #(or use a virtualenv)
source set_env.sh 
python manage.py runserver #(default port: 5000)
``
This code depends on a number of Python modules, including Flask (web server), and PyLD, rdflib, and SPARQLWrapper (Linked Data functionalities around RDF graph handling, JSON-LD conversion, and SPARQL querying). A full listing of the dependencies is available in the requirements.txt file.


MELD Clients Core
-----------------
A React.js library providing common MELD web page elements, graph traversal actions, rendering and interaction handlers, and state reducers. To include this in your MELD app, add the following entry to the dependencies in your application's package.json file:

``
"meld-clients-core": "oerc-music/meld-clients-score"
``
MELD Clients Core depends on a number of npm modules, including React, Redux, and Redux-Thunk (web application framework), Axios (HTTP communication), and "jsonld" and "n3" (Linked Data functionalities around RDF graph handling and JSON-LD conversion). A full list of dependencies is available in the package.json file.

MELD Clients Core also includes JavaScript components of [Verovio](http://www.verovio.org), a music engraving library developed by the Swiss RISM office (see [rism-ch/verovio](http://github.com/rism-ch/verovio) repository).

MELD Apps
---------
Several MELD apps are under development in private repositories. One public example is available at [oerc-music/delius-annotation](http://github.com/oerc-music/delius-annotation).


MELD: Summary 
-------
This repository contains basic documentation for the *Music Encoding  and  Linked Data*  (**MELD**)  framework  for distributed
real-time annotation of digital music scores. In a typical MELD application, users
and software agents create semantic annotations of music concepts and relationships, which are associated with musical structure specified by the [Music Encoding Initiative](http://music-encoding.org) schema (**MEI**). Annotations conforming to the [Web Annotations data model](https://www.w3.org/TR/annotation-model/) are expressed as RDF or JSON-LD, allowing alternative music and use-case vocabularies to be applied, to support e.g., popular vs.  classical music structures, or rehearsal, performance, or analytical applications.  The same underlying framework retrieves, distributes, and processes information that addresses semantically distinguishable music elements.  Further knowledge is incorporated from external sources through the use of Linked Data, which is also used to match annotation types and contexts to rendering actions displaying the annotations upon the digital
score.

For a detailed summary, please refer to our ISMIR 2017 paper: https://ora.ox.ac.uk/objects/uuid:945287f6-5dd3-4424-940c-b919b8ad2768

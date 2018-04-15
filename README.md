MELD: Music Encoding and Linked Data
====================================

Summary 
-------
This repository contains basic documentation for the *Music Encoding  and  Linked Data*  (**MELD**)  framework  for distributed
real-time annotation of digital music scores. In a typical MELD application, users
and software agents create semantic annotations of music concepts and relationships, which are associated with musical structure specified by the [Music Encoding Initiative](http://music-encoding.org) schema (**MEI**). Annotations conforming to the [Web Annotations data model](https://www.w3.org/TR/annotation-model/) are expressed as RDF or JSON-LD, allowing alternative music and use-case vocabularies to be applied, to support e.g., popular vs.  classical music structures, or rehearsal, performance, or analytical applications.  The same underlying framework retrieves, distributes, and processes information that addresses semantically distinguishable music elements.  Further knowledge is incorporated from external sources through the use of Linked Data, which is also used to match annotation types and contexts to rendering actions displaying the annotations upon the digital
score.

For a detailed summary, please refer to our ISMIR 2017 paper: https://ora.ox.ac.uk/objects/uuid:945287f6-5dd3-4424-940c-b919b8ad2768

MELD Client Core
----------------
If you are looking to develop a new MELD application, you will want to have a look at the meld-clients-core repository at [https://github.com/oerc-music/meld-clients-core].

MELD Web Services
-----------------
A basic reference implementation of the MELD annotation and session web services is available at the meld-web-services repository at [https://github.com/oerc-music/meld-web-services].

![MELD Overview](meld-overview.png)

**Further documentation and reference MELD applications coming soon - in the meantime, feel free to contact @musicog (david.weigl@oerc.ox.ac.uk) for help.**

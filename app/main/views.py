from flask import render_template, request, redirect, url_for, current_app, abort, make_response
from config import basedir
from pprint import pprint
from SPARQLWrapper import SPARQLWrapper, JSON
from pyld import jsonld
import json 
from rdflib import Graph, plugin, URIRef, Literal
from rdflib.parser import Parser
from rdflib.serializer import Serializer
import os
import shutil
import re
from shortuuid import uuid
from datetime import datetime

from . import main

def best_mimetype():
    best = request.accept_mimetypes.best_match( \
        ["application/rdf+xml", "text/n3", "text/turtle", "application/n-triples", \
        "application/json", "text/html"])
    if not best: 
        abort(406) # unacceptable
    # browser might accept on */*, in which case we should probably deliver html
    if request.accept_mimetypes[best] == request.accept_mimetypes["text/html"]:
        best = "text/html"
    return best


@main.route("/annotations/<uid>", methods=["GET"])
def index(uid):
    rdf_file = "{0}/rdf/{1}.ttl".format(basedir, uid)
    if not os.path.isfile(rdf_file):
        abort(404) # file not found
    g = Graph().parse(rdf_file, format="turtle")
    raw_json = json.loads(g.serialize(format="json-ld", indent=2))
    framed = jsonld.frame(raw_json, {
        "@context": { 
                "rdfs":        "http://www.w3.org/2000/01/rdf-schema#",
                "rdf":        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                "cnt":         "http://www.w3.org/2011/content#",
                "oa":          "http://www.w3.org/ns/oa#",
#                "meld":    "http://meld.linkedmusic.org/annotations/",
                "meldterm":    "http://meld.linkedmusic.org/terms/",
                "manifest":        "http://meld.linkedmusic.org/manifestations/",
                "leitmotif":   "http://meld.linkedmusic.org/leitmotif/",
                "frbr":        "http://purl.org/vocab/frbr/core#",
                "fabio":        "http://purl.org/spar/fabio/",
                "dct":         "http://purl.org/dc/terms/"
        },
            "@type": "meldterm:topLevel", 
            "oa:hasBody": {
                "@type": "oa:Annotation",
                "oa:hasTarget": { 
                    "fabio:isManifestationOf": {
                        "@type": "frbr:Work",
                        "@embed": "@always"
                    },
                    "@embed":"@always"
                },
                "@embed":"@always"
            },
            "@embed":"@always"
        }, options={"compactArrays":False})

    best = best_mimetype()
    if best == "text/html":
        return render_template("meld.html", annotations=json.dumps(framed, indent=2))
    elif best == "application/json":
        return json.dumps(framed, indent=2)
    else:
        return g.serialize(format=best)

    
@main.route("/jams/<uid>", methods=["GET"])
@main.route("/jams/<uid>/<voice>", methods=["GET"])
def jams(uid, voice=''):
    #n.b. voice not actually used here; used clientside
    rdf_file = "{0}/rdf/{1}.ttl".format(basedir, uid)
    if not os.path.isfile(rdf_file):
        abort(404) # file not found
    g = Graph().parse(rdf_file, format="turtle")
    raw_json = json.loads(g.serialize(format="json-ld", indent=2))
    framed = jsonld.frame(raw_json, {
        "@context": { 
                "rdfs":        "http://www.w3.org/2000/01/rdf-schema#",
                "rdf":        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                "cnt":         "http://www.w3.org/2011/content#",
                "oa":          "http://www.w3.org/ns/oa#",
                "meldterm":    "http://meld.linkedmusic.org/terms/",
                "manifest":        "http://meld.linkedmusic.org/manifestations/",
                "leitmotif":   "http://meld.linkedmusic.org/leitmotif/",
                "frbr":        "http://purl.org/vocab/frbr/core#",
                "fabio":        "http://purl.org/spar/fabio/",
                "dct":         "http://purl.org/dc/terms/"
        },
        "@type": "meldterm:topLevel"
        }, options={"compactArrays":False})

    best = best_mimetype()
    if best == "text/html":
        return render_template("dynameld.html", annotations=json.dumps(framed, indent=2))
    elif best == "application/json":
        return json.dumps(framed, indent=2)
    else:
        return g.serialize(format=best)
    
@main.route("/jams/<uid>/jump", methods=["POST"])
def jumpTo(uid):
    jumpFrom = request.form["trigger"]
    jumpTo = request.form["jumpTarget"]
    # load the current RDF file
    rdf_file = "{0}/rdf/{1}.ttl".format(basedir, uid)
    if not os.path.isfile(rdf_file):
        abort(404) # file not found
    newActionId = uuid()
    with open(rdf_file, "a") as jamfile:
        jamfile.write("""
        <http://meld.linkedmusic.org/jams/{0}> oa:hasBody meld:{1} .
        meld:{1} a oa:Annotation ;
            oa:hasBody [
                a meldterm:Jump ;
                meldterm:jumpTo <{2}>
            ];
            oa:hasTarget <{3}> .
            """.format(uid, newActionId, jumpTo, jumpFrom))

    return("", 200);

@main.route("/collection", methods=["POST"])
def createCollection():
	topLevelTargets = request.form["topLevelTargets"].split("|")
	topLevelId = uuid()
	subscriptionId = uuid()
	subscriptionFile = "{0}/subscription/{1}".format(basedir, subscriptionId)
	collectionFile = "{0}/collection/{1}".format(basedir, topLevelId)
	collectionJson = json.loads("""{{
	"@context": {{ 
		"cnt": "http://www.w3.org/2011/content#", 
		"rdfs": "http://www.w3.org/2000/01/rdf-schema#", 
		"fabio": "http://purl.org/spar/fabio/", 
		"leitmotif": "http://meld.linkedmusic.org/leitmotif/", 
		"manifest": "http://meld.linkedmusic.org/manifestations/", 
		"frbr": "http://purl.org/vocab/frbr/core#", 
		"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#", 
		"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
		"oa": "http://www.w3.org/ns/oa#", 
		"dct": "http://purl.org/dc/terms/", 
		"meldterm": "http://meld.linkedmusic.org/terms/"
	}},
	"@graph": [{{
		"@id": "http://meld.linkedmusic.org/collection/{0}",
		"@type": [
			"meldterm:topLevel",
			"oa:Annotation"
		],
		"meldterm:subscription": ["http://meld.linkedmusic.org/subscription/{1}"],
		"oa:annotatedAt": [
			"{2}"
		],
		"oa:hasBody": []
	}}]
}}""".format(topLevelId, subscriptionId, datetime.now().isoformat()))
	collectionJson["@graph"][0]["oa:hasTarget"] = topLevelTargets
	with open(collectionFile, 'w') as collection:
		json.dump(collectionJson, collection, indent=2)
	response = make_response("", 201)
	response.headers["Location"] = "/collection/{0}".format(topLevelId)
	return response

@main.route("/collection/<collectionId>", methods=["POST"])
def appendToCollection(collectionId):
# TODO:
# - Authentication
# - Marking annotations for specific user or all users
# - Priviledged and unpriviledged access accordingly
# - sanity-check the incoming annotation
# - respond with 202 accepted
# - after that, follow up new annotation in all related annostates
	annotation = request.get_json()
	collectionFile = "{0}/collection/{1}".format(basedir, collectionId)
	if not os.path.isfile(collectionFile):
		abort(404)
	with open(collectionFile, 'r') as collection:
		collJson = json.load(collection)
	collection["oa:annotatedAt"] = [datetime.now().isoformat()]
	collJson["@graph"][0]["oa:hasBody"].append(annotation)
	with open(collectionFile, 'w') as collection:
		collection.write(json.dumps(collJson, indent=2))
	return make_response("", 202)



@main.route("/annostate", methods=["POST"])
def createAnnoState():
	collectionUri = request.form["collection"].rsplit('collection/', 1)
	if len(collectionUri) != 2 or not os.path.isfile("{0}/collection/{1}".format(basedir, collectionUri[1])):
		return make_response("Specified collection does not exist", 404)
	annoStateId = uuid()
	# create a fresh annostate view of the collection
	collectionFile = "{0}/collection/{1}".format(basedir, collectionUri[1])
	annoStateFile = "{0}/annostate/{1}".format(basedir, annoStateId)
	with open(collectionFile, 'r') as collection:
		collJson = json.load(collection)
	# for any non-top-level annotation, indicate that we have yet to action it
	for ix, obj in enumerate(collJson["@graph"][0]["oa:hasBody"]):
		collJson["@graph"][0]["oa:hasBody"][ix].update({"meldterm:actionRequired": True})

	with open(annoStateFile, 'w') as annoState:
		annoState.write(json.dumps(collJson, indent=2))

	# subscribe this annostate to the collection
	subscriptionId = collJson["@graph"][0]["meldterm:subscription"][0].rsplit('subscription/', 1)[1]
	subscriptionFile = "{0}/subscription/{1}".format(basedir, subscriptionId)

	with open(subscriptionFile, 'a') as subscription:
		subscription.write("http://meld.linkedmusic.org/annostate/{0}\n".format(annoStateId))

	response = make_response("",201)
	response.headers["Location"] = "/annostate/{0}".format(annoStateId)
	return response

@main.route("/annostate/<annoStateId>") 
def getAnnoState(annoStateId):
	if not os.path.isfile("{0}/annostate/{1}".format(basedir, annoStateId)):
		abort(404)
	return open("{0}/annostate/{1}".format(basedir, annoStateId), "r").read()

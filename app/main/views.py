from flask import render_template, request, redirect, url_for, current_app, abort, make_response
from config import basedir, baseuri
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
        <{0}jams/{1}> oa:hasBody meld:{2} .
        meld:{1} a oa:Annotation ;
            oa:hasBody [
                a meldterm:Jump ;
                meldterm:jumpTo <{3}>
            ];
            oa:hasTarget <{4}> .
            """.format(baseuri, newActionId, jumpTo, jumpFrom))

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
		"@id": "{0}/collection/{1}",
		"@type": [
			"meldterm:topLevel",
			"oa:Annotation"
		],
		"meldterm:subscription": ["{0}/subscription/{2}"],
		"oa:annotatedAt": [
			"{3}"
		],
		"oa:hasBody": [],
		"oa:hasTarget": []
	}}]
}}""".format(basedir, topLevelId, subscriptionId, datetime.now().isoformat()))
	
	[collectionJson["@graph"][0]["oa:hasTarget"].append({"@id":target}) for target in topLevelTargets]
	with open(collectionFile, 'w') as collection:
		json.dump(collectionJson, collection, indent=2)
	response = make_response("", 201)
	response.headers["Location"] = "/collection/{0}".format(topLevelId)
	return response

@main.route("/collection/<collectionId>", methods=["POST"])
def appendToCollection(collectionId):
# TODO:
#	- worry about race condition
# - Authentication
#	-	Validation
# - Marking annotations for specific user or all users
# - Priviledged and unpriviledged access accordingly
# - respond with 202 accepted immediately
# - after that, follow up new annotation in all related annostates
	annotation = request.get_json()
	collectionFile = "{0}/collection/{1}".format(basedir, collectionId)
	if not os.path.isfile(collectionFile):
		abort(404)
	#FIXME RACE CONDITION!
	with open(collectionFile, 'r') as collection:
		collJson = json.load(collection)
	annotation["@id"] = "{0}/annotation/{1}".format(baseuri, uuid())
	annotation["oa:annotatedAt"] = datetime.now().isoformat()
	appendOrSet(annotation, "@type", "oa:Annotation")
	collJson["@graph"][0]["oa:hasBody"].append(annotation)
	with open(collectionFile, 'w') as collection:
		collection.write(json.dumps(collJson, indent=2))
	# now update every subscriber
	subscriptionId = collJson["@graph"][0]["meldterm:subscription"][0].rsplit('subscription/', 1)[1]
	subscriptionFile = "{0}/subscription/{1}".format(basedir, subscriptionId)
	with open(subscriptionFile) as subscription:
		subscribers = subscription.readlines()
	# initialise annostate for annotation
	annotation["meldterm:actionRequired"] = True
	# write out to subscribers
	for sub in subscribers:
		annostateId = sub.rsplit('annostate/', 1)[1].replace("\n","")
		annostateFile = "{0}/annostate/{1}".format(basedir, annostateId)
		# FIXME RACE CONDITION!
		with open(annostateFile, 'r') as annostate:
			annostateJson = json.load(annostate)
		annostateJson["@graph"][0]["oa:hasBody"].append(annotation)
		with open(annostateFile, 'w') as annostate:
			annostate.write(json.dumps(annostateJson, indent=2))
	return make_response("", 202)

def appendOrSet(anno, annokey, annovalue):
	# helper function: be flexible and allow user to provide their own annovalue for annokey
	if annokey in anno:
		if type(anno[annokey]) is list:
			anno[annokey].append(annovalue)
		else:
			anno[annokey] = [anno[annokey], annovalue]
	else:
		anno[annokey] = [annovalue]

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
		subscription.write("{0}/annostate/{1}\n".format(basedir, annoStateId))

	response = make_response("",201)
	response.headers["Location"] = "/annostate/{0}".format(annoStateId)
	return response

@main.route("/annostate/<annoStateId>", methods=["GET"]) 
# this will be polled repeatedly by clients
# provided here for convenience, but ideally handled by a fast static-file http server 
# (e.g. NGINX using limit_except GET)
def getAnnoState(annoStateId):
	if not os.path.isfile("{0}/annostate/{1}".format(basedir, annoStateId)):
		abort(404)
	return open("{0}/annostate/{1}".format(basedir, annoStateId), "r").read()

@main.route("/viewer", methods=["GET"])
def getViewer():
    if request.args.get('annostate') is None:
        abort(400)
    return render_template("viewer.html", annostate=request.args.get('annostate'))

@main.route("/annostate/<annoStateId>", methods=["PATCH"])
def patchAnnoState(annoStateId):
	if not os.path.isfile("{0}/annostate/{1}".format(basedir, annoStateId)):
		return make_response("Specified annotation state not found", 404) # annotation state not found
	if not "annotationId" in request.form or not "actionRequired" in request.form:
		return make_response("Must supply annotationId and actionRequired flag", 400) # bad request
	with open("{0}/annostate/{1}".format(basedir, annoStateId), "r") as annoState:
		annoStateJson = json.load(annoState)
	# search through list of annotations for index of the annotation whose state we want to change
	annoIndex = next((ix for ix, anno in enumerate(annoStateJson["@graph"][0]["oa:hasBody"]) if request.form["annotationId"] in anno["@id"]), -1)
	if annoIndex == -1:
		return make_response("Specified annotationId not found:{0}".format(request.form["annotationId"]), 404) # annotationId not found
	# now update the rendering state as requested
	annoStateJson["@graph"][0]["oa:hasBody"][annoIndex]["meldterm:actionRequired"] = request.form["actionRequired"]
	# and write the file out 
	#FIXME RACE CONDITION!
	with open("{0}/annostate/{1}".format(basedir, annoStateId), "w") as annoState:
		annoState.write(json.dumps(annoStateJson, indent=2))
	return make_response("",200)
		
 

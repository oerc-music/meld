from flask import render_template, request, redirect, url_for, current_app, abort, make_response, send_file, jsonify
from config import basedir, baseuri, meibaseuri, muzicodesuri, basecamp_mei_file
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
import md5

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
    print rdf_file
    if not os.path.isfile(rdf_file):
        abort(404) # file not found
    newActionId = uuid()
    print "TRYING NOW"
    with open(rdf_file, "a") as jamfile:
        jamfile.write("""
        <{0}/jams/{1}> oa:hasBody meld:{2} .
        meld:{2} a oa:Annotation ;
            oa:hasBody [
                a meldterm:Jump ;
                meldterm:jumpTo <{3}>
            ];
            oa:hasTarget <{4}> .
            """.format(baseuri, uid, newActionId, jumpTo, jumpFrom))

    return("", 200)

@main.route("/jams/<uid>/jump", methods=["GET"])
def jumpToByGet(uid):
    jumpFrom = request.args["from"]
    jumpTo = request.args["to"]
    baseuri = "http://meld.linkedmusic.org/mei/" + uid + ".mei"
    print jumpFrom
    print jumpTo
    # load the current RDF file
    rdf_file = "{0}/rdf/{1}.ttl".format(basedir, uid)
    if not os.path.isfile(rdf_file):
        abort(404) # file not found
    newActionId = uuid()
    with open(rdf_file, "a") as jamfile:
        jamfile.write("""
        <{0}/jams/{1}> oa:hasBody meld:{2} .
        meld:{2} a oa:Annotation ;
            oa:hasBody [
                a meldterm:Jump ;
                meldterm:jumpTo <{3}>
            ];
            oa:hasTarget <{4}> .
            """.format(baseuri, uid, newActionId, baseuri+ "#" + jumpTo, baseuri + "#" + jumpFrom));

    return("OKAY!");

@main.route("/resetdemo", methods=["GET"])
def resetDemo():
	shutil.copy("{0}/rdf/resetdemo.ttl".format(basedir), "{0}/rdf/demo.ttl".format(basedir))
	return('<html><head><title>Demo reset</title></head><body><a href="/jams/demo">Go to demo</a>')
		


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
                "meldterm:createAnnoState": "{0}/collection/{1}/createAnnoState",
		"oa:annotatedAt": [
			"{3}"
		],
		"oa:hasBody": [],
		"oa:hasTarget": []
	}}]
}}""".format(baseuri, topLevelId, subscriptionId, datetime.now().isoformat()))
	
	[collectionJson["@graph"][0]["oa:hasTarget"].append({"@id":target}) for target in topLevelTargets]
	with open(collectionFile, 'w') as collection:
		json.dump(collectionJson, collection, indent=2)
	response = make_response('<html><head><link rel="monitor" href="{0}/collection/{1}/createAnnoState"></head></html>'.format(baseuri, topLevelId),201)
	response.headers.add("Location", baseuri + "/collection/{0}".format(topLevelId))
        print "Returning new collection at: {0}".format(baseuri + "/collection/" + topLevelId)
	return response

@main.route("/collection/<collectionId>/createAnnoState", methods=["POST"])
def createAnnoState(collectionId):
	if not os.path.isfile("{0}/collection/{1}".format(basedir, collectionId)):
		return make_response("Specified collection does not exist", 404)
	annoStateId = uuid()
	# create a fresh annostate view of the collection
	collectionFile = "{0}/collection/{1}".format(basedir, collectionId)
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
	response.headers.add("Location", "/annostate/{0}".format(annoStateId))
        print "Creating new annostate for collection {0} at: /annostate/{1}".format(collectionId, annoStateId)
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
        annotation = request.get_json(force=True)
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
    return render_template("viewer.html", annostate=request.args.get('annostate'), baseuri=baseuri, muzicodesuri = muzicodesuri)

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
		
@main.route("/startTheClimb", methods=["GET"])
def startTheClimb():
    # special route to start a new session of Maria Kallionpaa's gamified piano composition
    return render_template("startTheClimb.html", meibaseuri=meibaseuri, basecamp_mei_file=basecamp_mei_file)

@main.route("/muzicodes/input", methods=["POST"])
def muzicodesDebug():
    # debug method for muzicodes calls -- these will actually be handled by the muzicodes server
    print "GOT MUZICODES CALL:"
    pprint(request.form)
    return make_response("", 200)

@main.route("/rdf/<uid>", methods=["GET"])
def getRdf(uid) : 
	with open("{0}/rdf/{1}".format(basedir, uid)) as rdfFile:
		rdf = rdfFile.read()
	rdf = "<pre>" + rdf + "</pre>"
	r = make_response(rdf, 200)
#	r.mimetype = "text/turtle"
	return r


###############################FAST MELD###################################

@main.route("/sessions", methods=["GET"])
# returns the list of all sessions (LDP container)
def getSessions():
    req_etags = request.headers.get('If-None-Match')
    sessionsFile = "{0}/sessions.ttl".format(basedir)
    # calculate file etag
    # see if it's in any of the req_etags. If so, return 304. 
    file_etag = calculateETag(sessionsFile)
    if req_etags and file_etag in req_etags:
        return make_response("", 304)
    #FIXME note race condition if file changes between the etag check and the end of the
    # with statement below!!
    with open(sessionsFile) as session:
        g = Graph().parse(session, publicID="{0}/sessions".format(baseuri), format="turtle")
        # TODO return as best mimetype
        r = make_response(g.serialize(format="turtle"), 200)
        # add etag to headers
        r.headers.add("ETag", file_etag)
        return r

@main.route("/sessions", methods=["POST"])
# add a new session to the LDP container
def createSession():
    contentType = request.headers.get('Content-Type')
    sessionsUri = baseuri + "/sessions/"
    slug = request.headers.get('Slug') 
    #FIXME do validation on slug
    if slug:
        if os.path.isfile("{0}/sessions/{1}.ttl".format(basedir, slug)):
            pubId = slug + "_" + uuid()
        else:
            pubId = slug 
    else:
        pubId = uuid() 
    try: 
        g = Graph().parse(publicID=sessionsUri + pubId, data=request.data, format=contentType)
    except Exception as e: 
        print e
        abort(400)
    # add in a link to this session's "join session" URI 
    g.add((URIRef(sessionsUri+pubId), URIRef("http://meld.linkedmusic.org/terms/joinSession"), URIRef(sessionsUri+pubId+"/join")))
    with open("{0}/sessions.ttl".format(basedir), "a") as sessionsContainer:
        sessionsContainer.write("\n<> ldp:contains <{0}> .".format(sessionsUri + pubId))
    with open("{0}/sessions/{1}.ttl".format(basedir, pubId), "w") as sessionFile:
        sessionFile.write(g.serialize(format="text/turtle"));
    r = make_response(g.serialize(format=contentType), 201)
    r.headers.add("Location", sessionsUri + pubId)
    return r

@main.route("/sessions/<sessionid>", methods=["GET"])
# returns the session
def getSession(sessionid):
    req_etags = request.headers.get('If-None-Match')
    sessionsFile = "{0}/sessions/{1}.ttl".format(basedir, sessionid)
    # calculate file etag
    # see if it's in any of the req_etags. If so, return 304. 
    try:
        file_etag = calculateETag(sessionsFile)
    except:
        abort(404)
    if req_etags and file_etag in req_etags:
        return make_response("", 304)
    #FIXME note race condition if file changes between the etag check and the end of the
    # with statement below!!
    with open(sessionsFile) as session:
        g = Graph().parse(session, publicID="{0}/sessions/{1}.ttl".format(baseuri,sessionid), format="turtle")
    # TODO return as best mimetype
    r = make_response(g.serialize(format="turtle"), 200)
    # add etag to headers
    r.headers.add("ETag", file_etag)
    return r
    
@main.route("/sessions/<sessionid>/join", methods=["POST"])
# join the session, adding in performer details and a link to this performerSessionView 
def joinSession(sessionid):
    contentType = request.headers.get('Content-Type')
    req_etags = request.headers.get('If-None-Match')
    sessionFile = "{0}/sessions/{1}.ttl".format(basedir, sessionid)
    if not req_etags:
        print "ETag missing"
        abort(400) # must include an etag when attempting to join session
    try:
        file_etag = calculateETag(sessionFile)
    except:
        abort(404) # requested sessions file (and thus, session) doesn't exist
    if file_etag not in req_etags:
        return abort(412) # precondition failed - client working with an outdated session
    with open(sessionFile) as session:
        # construct graph for this session
        g = Graph().parse(session, publicID="{0}/sessions/{1}".format(baseuri,sessionid), format="turtle")
    try:
        sessionPerformerUri ="{0}/sessions/{1}/{2}".format(baseuri,sessionid, uuid())
        # construct sub-graph supplied by request
        h = Graph().parse(publicID=sessionPerformerUri, data=request.data, format=contentType)
        # mint a link to this session performer view
        h.add((
            URIRef(sessionPerformerUri),
            URIRef("http://meld.linkedmusic.org/terms/sessionPerformerView"),
            URIRef("http://meld.linkedmusic.org/view/{0}".format(uuid()))
        ))
    except Exception as e: 
        print e
        abort(400) # bad request - can't interpret request data
    # link the sub-graph into our session graph
    g.add(( 
        URIRef("{0}/sessions/{1}".format(baseuri, sessionid)), 
        URIRef("http://meld.linkedmusic.org/terms/performedBy"),
        URIRef(sessionPerformerUri)
    ))
    # and merge them
    g = g + h
    tmpFile = "{0}/tmp/{1}".format(basedir, uuid())
    with open(tmpFile, 'w') as tmp:
        tmp.write(g.serialize(format="turtle"))
    # check etag of sesion file one more time...
    new_etag = calculateETag(sessionFile)
    if file_etag != new_etag:
        abort(412) # precondition failed - file changed while we were handling the request!
    # atomically overwrite old session file with new tmp file
    os.rename(tmpFile, sessionFile)
    r = make_response("",201)
    r.headers.add("Location", "{0}/sessions/{1}".format(baseuri, sessionid))
    r.headers.add("ETag", file_etag)
    return r
    



def calculateETag(theFile):
	# helper function: calculate ETag in a consistent way
        # currently: hash of size + last modified
        stats = os.stat(theFile)
        m = md5.new()
        m.update(str(stats.st_size))
        m.update(str(stats.st_mtime))
        return  m.hexdigest()


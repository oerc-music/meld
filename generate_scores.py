import sys
import os
import json
from rdflib import Graph, plugin, URIRef, Literal, BNode
from rdflib.parser import Parser
from rdflib.serializer import Serializer
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print "Please invoke with: python generate_scores.py /path/to/scores.json http://uri/of/score/dir /filepath/of/score/dir/"
        sys.exit()
    inputfile = sys.argv[1]
    scoreuri= sys.argv[2]
    scoredir = sys.argv[3]

    context = json.loads('''
      {
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "popRoles": "http://pop.linkedmusic.org/roles/", 
        "mo": "http://purl.org/ontology/mo/", 
        "ldp": "http://www.w3.org/ns/ldp#", 
        "mp": "http://id.loc.gov/authorities/performanceMediums/", 
        "oa": "http://www.w3.org/ns/oa#",
        "dct": "http://purl.org/dc/terms/",
        "frbr": "http://purl.org/vocab/frbr/core#",
        "meld": "http://meld.linkedmusic.org/terms/",
        "motivation": "http://meld.linkedmusic.org/motivation/"
      }
    ''')

    scoredir = os.path.join(scoredir, '') # ensure trailing slash
    scoreuri= os.path.join(scoreuri, '') # ensure trailing slash
    with open(inputfile) as f:
        inputjson = json.load(f)
    
    for score in inputjson:
        muzicodes = []
        for muzicode in score["muzicodes"]:
            meiElements = []
            for meiElement in muzicode["meiElements"]:
                meiElements.append({"@id": score["mei"] + "#" + meiElement})
            muzicodes.append({
                "@id": scoreuri + score["scoreId"] + "#" + muzicode["muzicodeId"],
                "@type": ["frbr:Expression", "meld:muzicode"],
                "frbr:partOf": scoreuri + score["scoreId"],
                "frbr:embodiment": {
                    "@type": ["rdf:Bag", "meld:MEIEmbodiment"],
                    "rdfs:member": meiElements,
                    "rdfs:label": muzicode["description"]
                }
            })
        thisScore = {
            "@context": context,
            "@id": scoreuri + score["scoreId"],
            "@type": "mo:Score",
            "mo:published_as": { "@id": score["mei"] },
            "frbr:part": muzicodes
        }
       
        g = Graph().parse(data=json.dumps(thisScore), format="json-ld")
        with open(scoredir + score["scoreId"] + ".ttl", 'w') as out:
            out.write(g.serialize(format="text/turtle"))


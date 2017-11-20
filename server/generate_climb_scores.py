import sys
import os
import json
from rdflib import Graph, plugin, URIRef, Literal, BNode
from rdflib.parser import Parser
from rdflib.serializer import Serializer
if __name__ == "__main__":
    if len(sys.argv) != 4:
        print "Please invoke with: python generate_climb_scores.py /path/to/climb-dump.json http://uri/of/score/dir /filepath/of/score/dir/"
        sys.exit()
    inputfile = sys.argv[1]
    scoreuri= sys.argv[2]
    scoredir = sys.argv[3]

    context = json.loads('''
        {
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "frbr": "http://purl.org/vocab/frbr/core#",
            "mo": "http://purl.org/ontology/mo/",
            "meld": "http://meld.linkedmusic.org/terms/",
            "climb": "http://meld.linkedmusic.org/climb/terms/",
            "mc": "http://meld.linkedmusic.org/climb/muzicodes/",
            "mctype": "http://meld.linkedmusic.org/climb/muzicodeTypes/",
            "meielements": "frbr:embodiment",
            "mcs": "frbr:part",
            "stage": "@id",
            "app": "rdfs:label",
            "mo": "http://purl.org/ontology/mo/",
            "type": {
                "@id": "mctype:type",
                "@type": "@id"
            },
            "next": {
              "@id": "climb:next",
              "@type": "@id"
            },
            "cue": {
              "@id": "climb:cue",
              "@type": "@id"
            },
            "meifile": {
              "@id": "mo:publication_of",
              "@type": "@id"
            }
        }
    ''')

    scoredir = os.path.join(scoredir, '') # ensure trailing slash
    scoreuri= os.path.join(scoreuri, '') # ensure trailing slash
    context["mei"] = os.path.join(os.getenv("MELD_MEI_URI", "http://meld.linkedmusic.org/mei/"), '')
    context["climbStage"] = os.path.join(os.getenv("MELD_SCORE_URI", "http://meld.linkedmusic.org/climb/stage/"), '')
    
    with open(inputfile) as f:
        inputjson = json.load(f)
    
    for stage in inputjson:
        # prefix "stage:"
        stage["@type"] = "mo:Score"
        stage["stage"] = "climbStage:" + stage["stage"] 
        if "next" in stage:
            stage["next"] = "climbStage:" + stage["next"]
        if "cue" in stage:
            stage["cue"] = map(lambda x: "climbStage:" + x, stage["cue"])
        # prefix "mei:"
        stage["meifile"] = "mei:" + stage["meifile"]
        # work through muzicode definitions
        for mc in stage["mcs"]:
            # prefix "mc:"
            mc["@id"] = "mc:" + mc["name"]
            mc["@type"] = ["meld:Muzicode", "frbr:Expression"]
            # prefix "mctype:" // nb, this is a muzicode type, not an rdfs:type!!!
            mc["type"] = "mctype:" + mc["type"]
            # prefix mei URI for mei elements
            mc["meielements"] = map(lambda x: stage["meifile"] + x, mc["meielements"])
            mc["meielements"] = {
                "@type": ["rdf:Bag", "meld:MEIEmbodiment"],
                "rdfs:member": map(lambda y: { "@id": y }, mc["meielements"])
            }

            # prefix "climbStage:"
            if "cue" in mc:
                mc["cue"] = "climbStage:" + mc["cue"]

        stage["@context"] = context

        g = Graph().parse(data=json.dumps(stage), format="json-ld")
        with open(scoredir + stage["stage"].replace("climbStage:", "")  + ".ttl", 'w') as out:
            out.write(g.serialize(format="text/turtle"))
#

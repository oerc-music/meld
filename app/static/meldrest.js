$.ajaxSetup({timeout: 1000});

var vrvToolkit = new verovio.toolkit();
var annotationGraph;
var scorePageMei;
var currentPage;
var currentMei;
var jumpToPage;
var actionsLog = [];

var jumpTargets = [];
var menu = [];

var composerUri;
var composerName;
var songList = [];

var queuedAnnoState;
var queuedMei;

var errorCount = 0;
var retryLimit = 10;

function preInitBoundingBoxes() { 
    // draw a basic (lowest-level-above-score) bounding box for every measure
    // to carry the contextual menu
    // additional bounding boxes go on top of this one
    // TODO refactor with initBoundingBox
    var fudgeX = 50; var fudgeY = 50; 
    var measures = $("#thescore .measure");
    for (var m = 0; m < measures.length; m++) { 
        if(!$(".baseBBox#base" + measures[m].id).length) { 
            // reset song list
            var songList = [];
            var targetElement = document.getElementById(measures[m].id)
                var bbox = targetElement.getBBox();
            var xpos = Math.round(bbox["x"]/10 + fudgeX);
            var ypos = Math.round(bbox["y"]/10 + fudgeY);
            var width = Math.round(bbox["width"]/10); 
            var height = Math.round(bbox["height"]/10);  
            $("#annotations").append('<span class="baseBBox" id="base' + measures[m].id+ '" style="left:' + xpos + 
                    '; top:' + ypos + 
                    '; width:' + width + 
                    '; height:' + height + 
                    '"/>');
            $(".baseBBox#base"+measures[m].id).contextMenu(menu, {triggerOn: "contextmenu"});

        }

    }
}

function grabExternalData() { 
    // only call me once per MEI file
    var meiFile = annotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"];
    $.get(meiFile, function() {console.log("trying...");}).done( function(xmlDoc) { 
        //console.log(xmlDoc);
        composerUri = $(xmlDoc).find("persName[role='composer'] ptr").attr("xlink:target");
        $.ajax( { 
            dataType:"jsonp",
            url:"http://127.0.0.1:8890/sparql?default-graph-uri=&query=PREFIX+dbr%3A+%3Chttp%3A%2F%2Fdbpedia.org%2Fresource%2F%3E%0D%0ASELECT+%3Fname+WHERE+{%0D%0A+++graph+%3Chttp%3A%2F%2Fmeld.linkedmusic.org%3E+{+%0D%0A++++++++"+ encodeURIComponent("<" + composerUri + ">") +"+foaf%3Aname+%3Fname+.%0D%0A+++}%0D%0A}&should-sponge=&format=application%2Fjson",
            success: function(data) { 
                composerName = data["results"]["bindings"][0]["name"]["value"];
            }
        }).done(function() { 
            $.ajax({
                dataType:"jsonp",
                url: "http://127.0.0.1:8890/sparql?default-graph-uri=&query=prefix+dbr%3A%09%3Chttp%3A%2F%2Fdbpedia.org%2Fresource%2F%3E+%0D%0APREFIX+skos%3A++++%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0Aprefix+dbo%3A%09%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2F%3E+%0D%0Aprefix+dbp%3A+++++%3Chttp%3A%2F%2Fdbpedia.org%2Fproperty%2F%3E%0D%0Aprefix+foaf%3A++++%3Chttp%3A%2F%2Fxmlns.com%2Ffoaf%2F0.1%2F%3E%0D%0A%0D%0Aselect+%3Ftitle+WHERE+{%0D%0A++GRAPH+%3Chttp%3A%2F%2Fmeld.linkedmusic.org%3E+{++%0D%0A++++%3Fs+a+dbo%3ASong+%3B%0D%0A+++++++foaf%3Aname+%3Ftitle+%3B%0D%0A+++++++dbp%3Aartist+" + encodeURIComponent("<" + composerUri + ">") + ".%0D%0A++}%0D%0A}%0D%0ALIMIT+30&should-sponge=&format=application%2Fjson",
                success:function(data) {
                    //console.log("SUCCESS", data["results"]["bindings"]);
                    results = data["results"]["bindings"];
                    for (r=0; r<results.length;r++) {
                        //console.log(results[r]["title"]["value"]);
                        songList.push({
                            name: results[r]["title"]["value"], 
                            title: results[r]["title"]["value"], 
                        });
                    }
                }
            })
            // now we can generate the menu and start the drawing loop (refresh) 
            generateMenu();
            refresh();
        })
    });
}


function initBoundingBox(target, actionid, exclude) { 
    var targetid = getTargetId(target["@id"]);
    if($("#" + targetid).length && !$("#" + actionid +  targetid).length) { 
        // if target is on page, and bounding box is not yet initialised...
        var fudgeX = 50; var fudgeY = 50; 
        var targetElement = document.getElementById(targetid)
            //console.log("inspecting", targetElement);
        var bbox = targetElement.getBBox();
        var xpos = Math.round(bbox["x"]/10 + fudgeX);
        var ypos = Math.round(bbox["y"]/10 + fudgeY);
        var width = Math.round(bbox["width"]/10); 
        var height = Math.round(bbox["height"]/10);  
        if(typeof exclude !== "undefined") { 
            excludeBBox = targetElement.getElementsByClassName(exclude)[0].getBBox();
            height = height - Math.round(excludeBBox["height"]/10);
        }

        $("#annotations").append('<span class="bbox ' + actionid + '" id="' + actionid + targetid + '"' + 
                ' style="left:' + xpos + 
                '; top:' + ypos + 
                '; width:' + width + 
                '; height:' + height + 
                '"/>');
    } else if(typeof exclude !== "undefined") { 
        // case where we already have a bbox (e.g. from a hl_1), but need to exclude verse
        var targetElement = document.getElementById(targetid)
            var bbox = $("#" + actionid + targetid);
        var excludeBBox = targetElement.getElementsByClassName(exclude)[0].getBBox();
        bbox.css("height", parseInt(bbox.css("height")) - Math.round(parseInt(excludeBBox["height"]/10)));
    }

}

function applyActions(actions, target, actionid, annotationid) {
    //console.log("Applying actions", actions, target, actionid, annotationid);
    for (var a=0; a<actions.length; a++) { 
        //console.log(actions[a]);
        if(Array.isArray(actions[a]["@type"])) {
            // composite annotations

        } else { 
            // simple annotations
            if (actions[a]["@type"] === "meldterm:CreateNextCollection") { 
                applyCreateNextCollection(target, actions[a]["resourcesToQueue"], actions[a]["annotationsToQueue"], annotationid);
            } else if (actions[a]["@type"] === "meldterm:QueueAnnoState") { 
                applyQueueAnnoState(target, actions[a]["annoStateToQueue"], annotationid);
            } else if (actions[a]["@type"] === "meldterm:NextPageOrPiece") { 
                applyNextPageOrPiece(target, annotationid);
            } else if (actions[a]["@type"] === "meldterm:PreviousPageOrPiece") { 
                applyPreviousPageOrPiece(target, annotationid);
            } else if(actions[a]["@type"] === "meldterm:Jump") { 
                //	console.log(target["@id"]);
                initBoundingBox(target, actionid);
                initBoundingBox(actions[a]["meldterm:jumpTo"][0], actionid);
                applyJump(target, actions[a]["meldterm:jumpTo"][0], actionid);
            }
        }
    }
}

function applyHTMLActions(actions, target, actionid) { 
    targetid = getTargetId(target["@id"]);
    targetAnchor = "a[name='" + targetid + "']";
    for(var a=0; a<actions.length; a++) { 
        if(Array.isArray(actions[a]["@type"])) { 
            if(actions[a]["@type"].indexOf("cnt:ContentAsText") > -1) { 
                // this is a textual label
                $(targetAnchor).attr("title", actions[a]["cnt:chars"]);
            }
        }
        else if(actions[a]["@type"] === "oa:SemanticTag") { 
            var action = /meldterm:(.*)/.exec(actions[a]["@id"])[1];
            $(targetAnchor).addClass(action);
            $(targetAnchor).hover(function() { $(".bbox." + actionid).addClass("hover")},
                    function() { $(".bbox." + actionid).removeClass("hover")} 
                    );
        }
    }
}

function applyCreateNextCollection(target, resources, initAnnotations, annotationid) { 
    // 0. PATCH to  this annostate with this annotationid to say it's handled
    $.ajax({
        type: "PATCH", 
    url: target,
    data: $.param({"annotationId": annotationid, "actionRequired": "false"})
    }).done( function() { 
        // 1. POST to /collection factory, specifying target resources and initial annotations
        //console.log("POSTING to collection")
        $.post(
            "/collection", 
            $.param({"topLevelTargets": resources.join("|"), "initialAnnotations": initAnnotations})
            ).done(function(data, textStatus, xhr) { 
                // 2. POST to the collection's createAnnoStateUri
                createAnnoStateUri = $.parseHTML(data)[0].getAttribute("href");
                //console.log("POSTING to createAnnoStateUri: ", createAnnoStateUri);
                $.post(
                    createAnnoStateUri
                    //				$.param({"collection": xhr.getResponseHeader("Location")})
                    ).done(function(data, textStatus, xhr) { 
                        // 3. POST a QueueAnnoState annotation to the current collection
                        //console.log("Posting to ", annotationGraph["@graph"][0]["@id"]);
                        $.post(
                            annotationGraph["@graph"][0]["@id"],
                            JSON.stringify({
                                "oa:hasTarget":[target], 
                            "oa:hasBody":[{
                                "@type":"meldterm:QueueAnnoState",
                            "annoStateToQueue": [xhr.getResponseHeader("Location")]
                            }]
                            })
                        )
                    })
            })
    });
    //			
    // TODO 4. If anything has failed PATCH /annostate back again
}

function applyQueueAnnoState(target, annostate, annotationid) { 
    // 1. load annostate into nextAnnoState variable in memory
    //      - TODO handle multiple queue items
    queuedAnnoState = annostate[0];
    // 2. GET the annotations to figure out the name of the next MEI file
    $.getJSON(queuedAnnoState).done(function(nextAnnotationGraph) { 
        //console.log(nextAnnotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"]);
        var queuedMeiUri = nextAnnotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"];
        queuedMei = queuedMeiUri.substr(queuedMeiUri.lastIndexOf('/')+1);
    });
    // 3. PATCH to /annostate with this annotationid to say it's handled
    $.ajax({
        type: "PATCH", 
        url: target,
        data: $.param({"annotationId": annotationid, "actionRequired": "false"})
    });
}

function applyNextPageOrPiece(target, annotationid) { 
    // 1. Call loadPage to progress to next page, or to the queued piece (annostate)
    loadPage();
    // 2. PATCH to /annostate with this annotationid to say it's handled
    $.ajax({
        type: "PATCH", 
        url: target,
        data: $.param({"annotationId": annotationid, "actionRequired": "false"})
    });
}

function applyPreviousPageOrPiece(target, annotationid) { 
    // PATCH to /annostate with this annotationid to say it's handled
    $.ajax({
        type: "PATCH", 
        url: target,
        data: $.param({"annotationId": annotationid, "actionRequired": "false"})
    }).done(function() { 
        if(currentPage > 1) { 
            currentPage--; 
        } else { 
            // browser back
            window.history.back();
        }
    });
}

function applyEmphasis(target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    var element = document.getElementById(targetid);
    element.classList.add("emphasis");
    // why not $("#targetid").addClass("emphasis") ?
    // see http://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
}

function applyHighlight(target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).addClass("highlight");
}

function applyHighlightLevel(target, actionid, hl_level) { 
    var targetid = getTargetId(target["@id"]);
    level = /hl_(\d+)/.exec(hl_level)[1]
        $("#" + actionid + targetid).addClass(hl_level).css("z-index", level);
    // if we do not yet have a control checkbox for this hl_level, make one
    if(!$("#controls #" +actionid).length) { 
        $("#controls").append(
                '<div class=' + hl_level + '><input type="checkbox" id="' + actionid +  
                '" checked onclick="toggleHighlight(this)"/></div>');
    }
}

function applyExternalRef(refUri, target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).addClass("externalRef").click(function() { 
        window.open(refUri, "_blank");
    });
}

function applyLabel(label, target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).attr("title", label);
}


function applyJump(from, to, actionid) { 
    if(!actionLogged(actionid)) { 
        var fromid = getTargetId(from["@id"]);
        var toid = getTargetId(to["@id"]);
        // depending on which page we're on, we may not be able to draw things...
        if($("#" + actionid + fromid).length) { 
            $("#" + actionid + fromid).addClass("jumpfrom").addClass("highlight").click(
                    function() { 
                        jumpToPage = vrvToolkit.getPageWithElement(toid);
                        loadPage();
                    });
        }
        if($("#" + actionid + toid).length) { 
            $("#" + actionid + toid).addClass("jumpto").addClass("highlight");
        }
    }
}

function toggleHighlight(control) { 
    annotationsId = $(control).attr("id");
    $("#annotations ." + annotationsId).toggle();
}


function getTargetId(target) { 
    // take the (local) fragment id from the (universal) identifier
    return target.substr(target.indexOf("#")+1)
}


function loadPage() {
    clearAnnotations();
    if(jumpToPage) { 
        // an action handler wants to jump to a specific page
        currentPage = jumpToPage;
        jumpToPage = "";
    } else { 
        if(currentPage < vrvToolkit.getPageCount()) {
            // go to the next page
            currentPage++;
        } else if (queuedAnnoState) { 
            // redirect the client to view the queued annostate
            window.location.href = baseuri + "/viewer?annostate=" + queuedAnnoState;
        } else { 
            // on last page; do nothing
            //console.log("loadPage: Already on last page...");
        }
    }
}

function nextPage() { 
    $.post(
        annotationGraph["@graph"][0]["@id"],
        JSON.stringify({
            "oa:hasTarget":[annostate], 
            "oa:hasBody":[{
                "@type":"meldterm:NextPageOrPiece"
            }]
        })
    );
}

function prevPage() { 
    $.post(
        annotationGraph["@graph"][0]["@id"],
        JSON.stringify({
            "oa:hasTarget":[annostate],
            "oa:hasBody":[{
                "@type":"meldterm:PreviousPageOrPiece"
            }]
        })
    );
}

function updateIndicator() { 
	$("#indicator").html("");
    targetid = annotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"];
    currentMei = targetid.substr(targetid.lastIndexOf('/')+1);
    $("#indicator").append("Current: "+decodeURIComponent(currentMei)+" | Page "+currentPage+" of "+vrvToolkit.getPageCount());
    if(queuedAnnoState) { 
        $("#indicator").append(" | Next: "+decodeURIComponent(queuedMei));
    }
//    var color="black";
//    var onLastPage = false;
//    if(currentPage === vrvToolkit.getPageCount()) { 
//        onLastPage = true;
//    }
//
//	if(onLastPage) { 
//		$("#indicator").append("Pedal action: load the next piece. ");
//	} else { 
//		$("#indicator").append("Pedal action: turn to next page. ");
//	}
//
//	if(queuedAnnoState) { 
//		$("#indicator").append("Next piece queued.")
//	} else { 
//		$("#indicator").append("NO NEXT PIECE QUEUED!");
//	}
//
//    if(onLastPage && queuedAnnoState) { 
//        color = "green";
//    } else if (onLastPage) { 
//        color = "red";
//    }
//
//    $("#indicator").css("color", color);
};

function drawPage() { 
    if(typeof scorePageMei === "object") { 
        var oSerializer = new XMLSerializer();
        scorePageMei = oSerializer.serializeToString(scorePageMei)
    }
    vrvToolkit.loadData(scorePageMei);
    updateIndicator();
    var svg = vrvToolkit.renderPage(currentPage);
    $("#thescore").html(svg);
    /* "pre"-init bounding boxes for each measure on page, adding context menu handlers */ 
    preInitBoundingBoxes()
        /* now process RDF */
        processRdf();
    /* and clean up */ 
    cleanUp();
}

function clearAnnotations() { 
    $("#annotations").html("");

}

function cleanUp() { 
    $(".jumpto").each( function() {
        var id = $(this).attr("id").substr(0, $(this).attr("id").indexOf("_")+1);;
        if(!actionLogged(id)) { 
            logAction(id);
        }
    });
}

function processRdf() {
    /* apply various actions as required */ 
    var annotations = annotationGraph["@graph"][0]["oa:hasBody"];
    if(typeof annotations !== "undefined") { 
        // work through each constituent annotation
        for (var a=0; a<annotations.length; a++) { 
            //console.log(annotations[a]);
            if(annotations[a]["meldterm:actionRequired"] === "false") {
                //FIXME n.b.: string "false", not boolean, because jquery mangled it into a string
                //when the client sent it to the server 
                continue; // no action required, so ignore it
            }
            actionid = annotations[a]["@id"].substr(annotations[a]["@id"].lastIndexOf("/")+1) + "_";
            var annotationBodies = annotations[a]["oa:hasBody"];
            var annotationTargets = annotations[a]["oa:hasTarget"];
            // apply actions encoded by the bodies to each target
            for (var t=0; t<annotationTargets.length; t++) { 
                applyActions(annotationBodies, annotationTargets[t], actionid, annotations[a]["@id"]);
            }
        }
    }
}

function logAction(actionid) { 
    actionsLog.push(actionid);
}

function actionLogged(actionid) { 
    return actionsLog.indexOf(actionid) > -1;
}

function refresh() { 
    var rdfFile = annostate;
    $.getJSON(rdfFile).done(function(graph) { 
        annotationGraph = graph;
        // if we are separating by voice, request the corresponding voice num
        //TODO make this bit more semantic; shouldn't be hacking the window URI...
        var meiFile = annotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"];
        //console.log(annotationGraph["@graph"][0]["oa:hasTarget"]);
        var pageUri= window.location.pathname;
        var voice = parseInt(pageUri.substr(pageUri.lastIndexOf('/')+1));
        $.get(meiFile, function(meiData) { 
            if(voice) { 
                // separate out this voice
                var elements = meiData.evaluate('//mei:staffDef[attribute::n] | //mei:staff[attribute::n]', meiData, function(prefix) { ns = { "mei": "http://www.music-encoding.org/ns/mei"}; return ns[prefix] || null}, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for(var e=0; e < elements.snapshotLength; e++) { 
                    element = elements.snapshotItem(e);
                    // delete elements for other voices
                    if($(element).attr("n") != voice) { 
                        element.parentNode.removeChild(element);
                    }
                }

            }
            scorePageMei = meiData;
        }).done(function() { 
            if(!queuedAnnoState && currentPage === vrvToolkit.getPageCount()) { 
                $("#nextButton").prop('disabled', true);
            } else { 
                $("#nextButton").prop('disabled', false);
            }
            drawPage();
            errorCount = 0;
            setTimeout(refresh, 20);
        });
    }).fail(function(xhr, textStatus) { 
        if(errorCount < retryLimit){
            errorCount++;
            // try again
            setTimeout(refresh, 20);
        } else { 
            $("#indicator").append(" | <span style='color:red;'>Sorry, giving up: "+textStatus+". Try refreshing the page?</span>");
        }
    }); 
}

function generateMenu() { 
    //console.log("Generating menu")
        jumpTargets = annotationGraph["@graph"][0]["oa:hasTarget"][0]["meldterm:hasJumpTarget"];
    jumpTargets= jumpTargets.sort(function(a,b) { 
        return a["meldterm:menuOrder"] - b["meldterm:menuOrder"];
    });
    var jumps = [];
    for (jt = 0; jt < jumpTargets.length; jt++) { 
        jumps.push({
            name: jumpTargets[jt]["rdfs:label"][0],
            title: jumpTargets[jt]["rdfs:label"][0],
            fun: function(data, e) { 
                var title = e["target"].title;
                var trigger = $(data.trigger).attr("id")
            trigger = trigger.substr(4); // chop off "base" prefix
        var jumpTarget = $.grep(jumpTargets, function(g) { 
            return g["rdfs:label"][0] === title;
        });
        jumpTarget = jumpTarget[0]["meldterm:startsAt"][0]["@id"];
        $.post(annotationGraph["@graph"][0]["@id"] + "/jump",
            {
                jumpTarget: jumpTarget,
            trigger: annotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"] + "#" + trigger
            }
            ).always(console.log("done"));
            }
        });
        menu = [{
            name: "jump",
                title: "jump",
                subMenu: jumps
        }, {
            name: "queue",
                title: "queue", 
                subMenu: [{
                    name: "songs by " + composerName,  
                    title: "songs by " + composerName,
                    subMenu : songList
                }, { 
                    name: "songs with similar instrumentation",
                    title: "songs with similar instrumentation",
                    subMenu : [] 
                }]
        }]
    }
}


$(document).ready(function() { 
    var options = JSON.stringify({
        ignoreLayout: 1,
        adjustPageHeight: 1,
        scale:50, 
				pageHeight: 2000
    });
    vrvToolkit.setOptions(options);
    currentPage = 1;
    queuedAnnoState = "";
    //grabExternalData(); // also triggers initial refresh call
    $.getJSON(annostate).done(function(graph) { 
        annotationGraph = graph; 
        // tell muzicodes we've loaded a new piece
        $.post(
            muzicodesuri + "/input",
            $.param({
                "name": "meld.load",
                "meldcollection":annotationGraph["@graph"][0]["@id"],
                "meldannostate":annostate,
                "meldmei": annotationGraph["@graph"][0]["oa:hasTarget"][0]["@id"]
            })
        );
        // and start the polling loop for this annostate
        refresh() ;
    }); 
});

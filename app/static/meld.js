
function initBoundingBox(target, actionid, exclude) { 
    var targetid = getTargetId(target["@id"]);
    if(!$("#" + actionid +  targetid).length) { 
        // if not yet initialised...
        var fudgeX = 50; var fudgeY = 50; 
        var targetElement = document.getElementById(targetid)
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

function applyActions(actions, target, actionid, targetType, manifestationOf) {
    if (targetType.indexOf("meldterm:HTMLManifestation") > -1) { 
        applyHTMLActions(actions, target, actionid, manifestationOf);
    } else { 
        for (var a=0; a<actions.length; a++) { 
            if(Array.isArray(actions[a]["@type"])) {
                if(actions[a]["@type"].indexOf("cnt:ContentAsText") > -1) { 
                    // this is a textual label
                    initBoundingBox(target, actionid);
                    applyLabel(actions[a]["cnt:chars"], target, actionid);
                } else if(actions[a]["@type"].indexOf("meldterm:externalRef") > -1) { 
                    arf = actions[a];
                    initBoundingBox(target, actionid);
                    applyExternalRef(actions[a]["rdfs:seeAlso"][0]["@id"], target, actionid);
                }
            } else if(actions[a]["@type"] === "oa:SemanticTag") {
                console.log("Action: ", actions[a]["@id"]);
                // this is a semantic tag
                if(actions[a]["@id"] === "meldterm:emphasis") { 
                    initBoundingBox(target, actionid);
                    applyEmphasis(target, actionid);
                } else if(actions[a]["@id"] === "meldterm:highlight") { 
                    initBoundingBox(target, actionid);
                    applyHighlight(target, actionid);
                } else if(actions[a]["@id"] === "meldterm:highlightExcludingVerse") { 
                    initBoundingBox(target, actionid, "verse");
                    applyHighlight(target, actionid);
                } else if(/meldterm:hl_\d+/.exec(actions[a]["@id"]) !== null) { 
                    initBoundingBox(target, actionid);
                    var level = /meldterm:(hl_\d+)/.exec(actions[a]["@id"])[1];
                    applyHighlightLevel(target, actionid, level);
                }
            }
        }
    }
}

function applyHTMLActions(actions, target, actionid, manifestationOf) { 
    targetid = getTargetId(target["@id"]);
    targetAnchor = "a[name='" + targetid + "']";
    if(typeof manifestationOf[0]["@type"] !== "undefined") { 
        lmName = manifestationOf[0]["rdfs:label"];
        bookTitle = manifestationOf[0]["frbr:partOf"][0]["dct:title"];
        if(bookTitle.length > 10) { 
            bookTitle =  bookTitle.substr(0,9)+'&hellip;';  
        }
        var menu = [{
            name: lmName,
            title: lmName,
            fun: function() { 
                var newwindow = window.open(manifestationOf[0]["rdfs:seeAlso"][0]["@id"], lmName, 'width=2300px,height=1326px,left=100, top=400,scrollbars=no');
                if (window.focus) {
                    newwindow.focus()
                }
            }
        }, {
            name: bookTitle,
            title: bookTitle,
            fun: function() { 
                var newwindow = window.open(manifestationOf[0]["frbr:partOf"][0]["rdfs:seeAlso"][0]["@id"], bookTitle, 'width=2600px,height=3000px,left=0, top=400,scrollbars=no');
                if (window.focus) {
                    newwindow.focus()
                }
            }
        } ];

        $(targetAnchor).contextMenu(menu, {triggerOn:'contextmenu'});
    }
    for(var a=0; a<actions.length; a++) { 
        console.log(target);


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

function applyEmphasis(target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    var element = document.getElementById(targetid);
    element.classList.add("emphasis");
    // why not $("#targetid").addClass("emphasis") ?
    // see http://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
    console.log("Applying emphasis to : " + actionid + targetid);
}

function applyHighlight(target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).addClass("highlight");
    console.log("Applying highlight to : " + actionid + targetid);
}

function applyHighlightLevel(target, actionid, hl_level) { 
    var targetid = getTargetId(target["@id"]);
    level = /hl_(\d+)/.exec(hl_level)[1]
    $("#" + actionid + targetid).addClass(hl_level).css("z-index", level);
    console.log("Changed highlight level on " + actionid + targetid + " to " + level);
    // if we do not yet have a control checkbox for this hl_level, make one
    if(!$("#controls #" +actionid).length) { 
        $("#controls").append(
                '<div class="' + hl_level + '"><input type="checkbox" id="' + actionid +  
                '" checked onclick="toggleHighlight(this)"/></div>');
    }
}

function applyExternalRef(refUri, target, actionid) { 
    console.log("Applying external ref to : " + actionid + targetid);
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).addClass("externalRef").click(function() { 
        window.open(refUri, "_blank");
    });
}

function applyLabel(label, target, actionid) { 
    var targetid = getTargetId(target["@id"]);
    $("#" + actionid + targetid).attr("title", label);
    console.log("Set label: " + label +  " on " + targetid);
}

function toggleHighlight(control) { 
    console.log("Control is ", control);
    annotationsId = $(control).attr("id");
    $("#annotations ." + annotationsId).toggle();
}


function getTargetId(target) { 
    // take the (local) fragment id from the (universal) identifier
    return target.substr(target.indexOf("#")+1)
}


$(document).ready(function() { 
    /* Figure out which MEI file is being annotated */
    var meiFile;
    var htmlFile;
    for (var ft=0; ft<annotationGraph["@graph"][0]["oa:hasTarget"].length; ft++) {
        if(annotationGraph["@graph"][0]["oa:hasTarget"][ft]["@type"] === "meldterm:MEIManifestation") {
            meiFile = annotationGraph["@graph"][0]['oa:hasTarget'][ft]["@id"];
        } else if(annotationGraph["@graph"][0]["oa:hasTarget"][ft]["@type"] === "meldterm:HTMLManifestation") {
            htmlFile = annotationGraph["@graph"][0]['oa:hasTarget'][ft]["@id"];

        }
    }
    /* Load the files using HTTP GET */
    var svg;
    var htmlResource= $.get( htmlFile, function(htmlData) {  
        $("#restpane #analysis").html(htmlData);
    });
    var meiResource = $.get( meiFile, function( meiData ) {
        //var oSerializer = new XMLSerializer();
        //meiData = oSerializer.serializeToString(meiData);
        var options = JSON.stringify({
            pageHeight: 5000,
            pageWidth: 2500,
            ignoreLayout: 1,
            adjustPageHeight: 1
        });
        var vrvToolkit = new verovio.toolkit();
        vrvToolkit.setOptions(options);
        var svg = vrvToolkit.renderData( meiData + "\n", "" );
        $("#thescore").html(svg);
    });
    $.when(htmlResource, meiResource).done(function() { 
        /* apply various actions as required */ 
        var annotations = annotationGraph["@graph"][0]["oa:hasBody"];
        if(typeof annotations !== "undefined") { 
            // work through each constituent annotation
            for (var a=0; a<annotations.length; a++) { 
                //var slashOrColon = annotations[a]["@id"].match(/[:/](?!.*[:/])/)[0]; // negative lookahead
               // actionid = annotations[a]["@id"].substr(annotations[a]["@id"].lastIndexOf(slashOrColon)+1) + "_";
                actionid = annotations[a]["@id"].substr(annotations[a]["@id"].lastIndexOf("/")+1) + "_";
                console.log("Applying actions: ", actionid);
                var annotationBodies = annotations[a]["oa:hasBody"];
                var annotationTargetSets = annotations[a]["oa:hasTarget"];
                for (var ts=0; ts<annotationTargetSets.length; ts++) {
                    var annotationTargets = annotationTargetSets[ts]["meldterm:contains"];
                    var annotationTargetType = annotationTargetSets[ts]["@type"];
                    var manifestationOf = annotationTargetSets[ts]["fabio:isManifestationOf"];

                    // apply actions encoded by the bodies to each target
                    for (var t=0; t<annotationTargets.length; t++) { 
                        console.log("Targetting: ", annotationTargets[t]);
                        console.log("Actionid: ", actionid);
                        console.log("Type: ", annotationTargetType);
                        console.log("Manifestation of: ", manifestationOf);
                        applyActions(annotationBodies, annotationTargets[t], actionid, annotationTargetType, manifestationOf);
                    }
                    
                    var citation = annotationTargetSets[ts]["fabio:isManifestationOf"][0];
                    if(!$("#controls #" + actionid).next().is("em")) {  // haven't yet filled out the leitmotiv-identification info
                        console.log("Applying new checkbox label. Action id is ", actionid);
                        $("#controls #" + actionid).after("<em>" + citation["rdfs:label"] + '</em> as per <a href="' + citation["frbr:partOf"][0]["frbr:creator"][0]["@id"] + '">' + citation["frbr:partOf"][0]["frbr:creator"][0]["rdfs:label"] +'</a>, <em><a href="' + citation["frbr:partOf"][0]["rdfs:seeAlso"][0]["@id"]  + '">' +  citation["frbr:partOf"][0]["dct:title"][0] + '</a></em>');
                    }
                }
            }
        }
    }, 'text');
});

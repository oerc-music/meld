import {browserHistory} from 'react-router';
import axios from 'axios';
import jsonld from 'jsonld'
import { ANNOTATION_PATCHED, ANNOTATION_POSTED, ANNOTATION_HANDLED, ANNOTATION_NOT_HANDLED} from './meldActions';

export const HAS_BODY = "oa:hasBody"
export const FETCH_SCORE = 'FETCH_SCORE';
export const FETCH_RIBBON_CONTENT = 'FETCH_RIBBON_CONTENT';
export const FETCH_CONCEPTUAL_SCORE = 'FETCH_CONCEPTUAL_SCORE';
export const FETCH_TEI = 'FETCH_TEI';
export const FETCH_GRAPH = 'FETCH_GRAPH';
export const FETCH_WORK = 'FETCH_WORK';
export const FETCH_TARGET_EXPRESSION = 'FETCH_TARGET_EXPRESSION';
export const FETCH_COMPONENT_TARGET = 'FETCH_COMPONENT_TARGET';
export const PROCESS_COMPONENT_TARGET = 'PROCESS_COMPONENT_TARGET';
export const FETCH_STRUCTURE = 'FETCH_STRUCTURE';
export const FETCH_MANIFESTATIONS = 'FETCH_MANIFESTATIONS';
export const SCORE_PREV_PAGE = 'SCORE_PREV_PAGE';
export const SCORE_NEXT_PAGE = 'SCORE_NEXT_PAGE';
export const SCORE_PAGE_TO_TARGET = 'SCORE_PAGE_TO_TARGET';
export const PROCESS_ANNOTATION = 'PROCESS_ANNOTATION';
export const SESSION_GRAPH_ETAG= 'SESSION_GRAPH_ETAG';
export const RESET_NEXT_SESSION_TRIGGER= 'RESET_NEXT_SESSION_TRIGGER';
export const REGISTER_PUBLISHED_PERFORMANCE_SCORE= 'REGISTER_PUBLISHED_PERFORMANCE_SCORE';
export const MUZICODES_UPDATED= 'MUZICODES_UPDATED';
// TODO DW 20170830 -- finish JSONLDifying these
export const REALIZATION_OF = 'frbr:realizationOf';
export const EXPRESSION = 'frbr:Expression';
export const PART_OF = 'frbr:partOf';
export const PART = 'frbr:part';
export const HAS_STRUCTURE= 'http://meld.linkedmusic.org/terms/hasStructure';
export const SEQ = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq';
export const SEQPART = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_';
export const SCORE = 'http://purl.org/ontology/mo/Score';
export const CONTAINS = 'http://www.w3.org/ns/ldp#contains';
export const MOTIVATED_BY= 'http://www.w3.org/ns/oa#motivatedBy';
export const SEGMENT = 'so:Segment';
export const MUZICODE= 'meld:muzicode';
export const PUBLISHED_AS = 'http://purl.org/ontology/mo/published_as';
export const HAS_PERFORMANCE_MEDIUM = 'http://rdaregistry.info/Elements/e/p20215';
export const HAS_PIANO = "http://id.loc.gov/authorities/performanceMediums/2013015550";

export const muzicodesUri = "http://127.0.0.1:5000/MUZICODES"

// TODO move context somewhere global -- most framing happens server side
// anyway, but in cases where the framed URI contains a fragment ("#"), 
// we have to do it client-side		
const context = { 
	"popRoles": "http://pop.linkedmusic.org/roles/", 
	"mo": "http://purl.org/ontology/mo/", 
	"ldp": "http://www.w3.org/ns/ldp#", 
	"mp": "http://id.loc.gov/authorities/performanceMediums/", 
	"oa": "http://www.w3.org/ns/oa#",
	"dct": "http://purl.org/dc/terms/",
	"frbr": "http://purl.org/vocab/frbr/core#",
	"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
	"meld": "http://meld.linkedmusic.org/terms/",
	"motivation": "http://meld.linkedmusic.org/motivation/",
	"so": "http://www.linkedmusic.org/ontologies/segment/",
	"dct": "http://purl.org/dc/terms/"
}

export function fetchScore(uri) { 
	console.log("FETCH_SCORE ACTION on URI: ", uri);
	const promise = axios.get(uri);
	return { 
		type: FETCH_SCORE,
		payload: promise 
	}
}

export function fetchRibbonContent(uri) {
	console.log("FETCH_RIBBON_CONTENT ACTION on URI: ", uri);
	const promise = axios.get(uri);
	return {
		type: FETCH_RIBBON_CONTENT,
		payload: promise
	}
}

export function fetchTEI(uri) { 
	const promise = new CETEI().getHTML5(uri);
    return (dispatch) =>  {
        promise.then( (data)  => { 
            dispatch( {
                type: FETCH_TEI,
                payload: {
                    data: data,
                    uri: uri
                }
            });
        });
    }
}

export function fetchSessionGraph(uri, etag = "") { 
	console.log("FETCH_SESSION_GRAPH ACTION ON URI: ", uri, " with etag: ", etag);
	// TODO add etag to header as If-None-Match and enable corresponding support on server
	// so that it can respond with 304 instead of 200 (i.e. so it can ommit file body)
	const promise = axios.get(uri, {
		headers: {'Accept': 'application/ld+json', 'If-None-Match':etag},
		validateStatus: function(stat) { 
			// only complain if code is greater or equal to 400
			// this is to not treat 304's as errors}
			return stat < 400;
		}
	});

    return (dispatch) => { 
        promise.then( (response)  => { 
			if(response.status == 304) { 
				return; // don't need to do any new work
			}
			const framed = response.data;
			const session = framed["@graph"][0];
			if(!etag) { 
				// first time through: follow your nose along the conceptual score
				// to retrieve the published score (MEI file)
				if ("mo:performance_of" in session) { 
					dispatch(fetchConceptualScore(session["mo:performance_of"]["@id"]));
				} else { console.log("SESSION IS NOT A PERFORMANCE OF A SCORE: ", session); }
			} 
			if(response.headers.etag !== etag) { 
				// we need to grab the graph data, either because this is the first time,
				// or because session etag has changed (i.e. annotation has been posted/patched)
				dispatch( { 
					type: FETCH_GRAPH,
					payload: framed 
				});
				// take note of the new etag
				dispatch( { 
					type: SESSION_GRAPH_ETAG,
					payload: {
						uri: uri,
						etag: response.headers.etag
					}
				});
				if("ldp:contains" in framed["@graph"][0]) { 
					// there are one or more annotations to process
					framed["@graph"][0] = ensureArray(framed["@graph"][0], "ldp:contains");
					// process each annotation
					framed["@graph"][0]["ldp:contains"].map( (annotation) => { 
						dispatch(processComponentAnnotation(annotation, session["mo:performance_of"]["@id"])); 
					});
				}
			}
        });
    }
}

export function fetchGraph(uri) {
	console.log("FETCH_GRAPH ACTION ON URI: ", uri);
	const promise = axios.get(uri);

    return (dispatch) => { 
        promise.then( ({data}) => { 
            // dispatch the graph data
            dispatch( { 
                type: FETCH_GRAPH,
                payload: data
            });
            // walk through component annotations
            data["@graph"][0]["ldp:contains"].map( (topLevel) => { 
                topLevel["oa:hasBody"].map( (annotation) => { 
                    dispatch(processComponentAnnotation(annotation)); 
                });

            });
        });
    }
}

function processComponentAnnotation(annotation, conceptualScore = "") { 
	annotation = ensureArray(annotation, "oa:hasTarget");
	console.log("Processing component annotation: ", annotation, conceptualScore)
    const targets = annotation["oa:hasTarget"].map( (target) => {
			return { 
				"@id": target["@id"],
				// DW TODO 20170830 may need to validate whether @type exists
				"@type": target["@type"], 
			}
	});
    return (dispatch) => { 
		targets.map( (target) => {
			dispatch(fetchComponentTarget(target["@id"], conceptualScore))
		});
		dispatch( { 
			type: PROCESS_ANNOTATION,
			payload: { 
				id: annotation["@id"],
				bodies: annotation["oa:hasBody"],
				targets: targets
			}
		});
    }
}


export function fetchComponentTarget(uri, conceptualScore = "") { 
    console.log("FETCH_COMPONENT_TARGET ACTION ON URI: ", uri);
	const promise = axios.get(uri, {headers: {'Accept': 'application/ld+json'}});
	return (dispatch) => {
		promise.then((data) => { 
			console.log("Attemping to frame data", data);
			if(!"content-type" in data.headers || 
				(data.headers["content-type"] !== "application/json" &&
				 data.headers["content-type"] !== "application/ld+json")
				) { 
				// need to convert triples to json
				// TODO handle arbitrary RDF format here (currently requires ntriples)
				jsonld.fromRDF(data.data, (err, doc) => {
					if(err) { console.log("ERROR CONVERTING NQUADS TO JSON-LD: ", err); }
					else { 
						dispatch(processComponentTarget(doc, uri, conceptualScore));
					}
				});
			} else { 
				// already in json format
				dispatch(processComponentTarget(data.data, uri, conceptualScore));
			}
		});
	}
}

function processComponentTarget(data, uri, conceptualScore) {
    console.log("PROCESS_COMPONENT_TARGET ACTION ON URI: ", uri);
	return (dispatch) => {
		jsonld.frame(data, { "@id":uri }, (err, framed) => {
			if(err) { 
				console.log("FRAMING ERROR in fetchComponentTarget:", err) 
				return { 
					type: ANNOTATION_NOT_HANDLED
				}
			}
			else { 
				jsonld.compact(framed, context, (err, compacted) => { 
					if(err) { console.log("COMPACTING ERROR in fetchComponentTarget:", err) }
					else { 
						dispatch( { 
							type: FETCH_COMPONENT_TARGET,
							payload: {
								conceptualScore: conceptualScore,
								structureTarget: uri
							}
						});
						console.log("COMPACTED: ", compacted);
						let typecheck = compacted;
						typecheck = ensureArray(typecheck, "@type");
						// have we found a segment?
						console.log("TYPECHECK: ", typecheck)
						if(typecheck["@type"].includes(SEGMENT) || typecheck["@type"].includes(MUZICODE)) { 
							// TODO jsonldify context
							// TODO refine muzicode semantics for this
							// found a segment or muzicode!
							// hand it off to the reducer to process the embodibag
							// nb this is a different route to larrymeld (via expression)
							// i.e. there is no partonomy here. So send the segment itself as the part.
							dispatch({ 
								type: FETCH_MANIFESTATIONS,
								payload: { 
									target: compacted,
									part: compacted
								}
							});
						} else { 
							// if not, continue following links via the target's expression
							dispatch(fetchTargetExpression(compacted));
						}
					}
				})
			}
		})
	}
}


export function fetchTargetExpression(compacted) { 
	// traverse from the provided Expression, via a Segment, to Manifestation(s)
	return(dispatch) => { 
		dispatch( { 
			type: FETCH_TARGET_EXPRESSION,
			payload:compacted 
		});
		let target = compacted;  
		if(target["@type"].includes(EXPRESSION)) { 
			// found an expression
			// does it have any parts?
			let parts = [];
			console.log("part check: ", target)
			if(PART in target) { 
				// sometimes we may have multiple parts or part sequences; sometimes only one
				// so ensure we have an array to work with (even if it's length one)
				// TODO refactor to use ensureArray helper function
				if(! Array.isArray(target[PART])) { 
					target[PART] = [target[PART]];
				}
				// now process each sequence
				target[PART].map((p) => { 
					if("@type" in p && p["@type"].includes(SEQ)) { 
						// it's an RDF sequence
						Object.keys(p).map( (part) => { 
							if(part.startsWith(SEQPART)) { 
								parts.push(p[part]["@id"]);
							} 
						});
					} else { 
						parts.push(p["@id"]);
					}
				});
				// now fetch the work to continue on to the manifestations associated with these parts
				if(REALIZATION_OF in target) {
					dispatch(fetchWork(compacted, parts, target[REALIZATION_OF]["@id"]));
				} else { console.log("Target is an unrealized expression: ", target); }
			} else { console.log("Target expression without parts", target); }
		} else { console.log("fetchTargetExpression attempted on a non-Expression! ", target); }
	}
}


export function fetchWork(target, parts, work) { 
	console.log("STARTING FETCHWORK WITH ", work, parts);
	return(dispatch) => {
		dispatch({
			type: FETCH_WORK,
			payload: { 
				target: target,
				parts: parts,
				works: work
			}
		});
		axios.get(work).then((data) => { 
			jsonld.fromRDF(data.data, (err, doc) => {
				if(err) { console.log("ERROR TRANSLATING NQUADS TO JSONLD: ", err, data.data) }
				else { 
					jsonld.frame(doc, { "@id":work}, (err, framed) => {
						if(err) { console.log("FRAMING ERROR in fetchWork:", err) }
						else { 
							jsonld.compact(framed, context, (err, compacted) => { 
								if(err) { console.log("COMPACTING ERROR in fetchWork:", err) }
								else { 
									work=compacted;
									// Check if there is a segment line, in which case fetch manifestations
									// else, check if this is part of another ("parent") work 
									if(HAS_STRUCTURE in work) { 
											dispatch(fetchStructure(target, parts, work[HAS_STRUCTURE]["@id"]));
									} else if(PART_OF in work) {
										// does our doc attach a Score which realizes the parent work?
										// FIXME HACKHACK:
										// framing expands the nice compacted URIs
										// so here we need to use full URIs instead of REALIZATION_OF as defined above
										jsonld.frame({"@context": context, "@graph": doc}, { 
											"http://purl.org/vocab/frbr/core#realizationOf": work[PART_OF]["@id"] 
											}, (err, framed) => {
											if(err) { console.log("FRAMING ERROR when fetching parent work", err) }
											else {
												console.log("Attached score:", framed);
												const attachedScore = framed["@graph"][0];
												if(attachedScore && "@type" in attachedScore && attachedScore["@type"] === SCORE) {
													// FIXME breaks with multiple types
													// Found an attached Score!!!
													if(PUBLISHED_AS in attachedScore) { 
														// for now: assume published scores
														// are attached in same file
														// FIXME enable external pub_scores
														attachedScore[PUBLISHED_AS].map( (pubScore) => {
															console.log("FOUND PUB SCORE: ", pubScore);
															if(HAS_PERFORMANCE_MEDIUM in pubScore) { 
																console.log("FOUND PERF MEDIUM: ", pubScore[HAS_PERFORMANCE_MEDIUM]);
																dispatch({
																	type: REGISTER_PUBLISHED_PERFORMANCE_SCORE,
																	payload: { 
																		work: work,
																		conceptualScore: attachedScore,
																		publishedScore: pubScore,
																		performanceMedium: pubScore[HAS_PERFORMANCE_MEDIUM]
																	}
																})
																if(pubScore[HAS_PERFORMANCE_MEDIUM]['@id']==HAS_PIANO) {
																	dispatch(fetchScore(pubScore["@id"]));
																} else {
																	dispatch(fetchRibbonContent(pubScore["@id"]));
																}
															} else { 
																console.log("Published score without performance medium: ", pubScore["@id"]);
															}
														})
													} else { 
														console.log("Unpublished score: ", attachedScore);
													}
													if(HAS_STRUCTURE in attachedScore) { 
														dispatch(fetchStructure(target, parts, attachedScore[HAS_STRUCTURE]["@id"]));
													} else { 
														console.log("Score ", attachedScore["@id"], " attached to work ", work["@id"], " has no segment line!!");
													}
												}  else { 
													// no attached Score, so we have to recurse on the parent work
													dispatch(fetchWork(target, parts, work[PART_OF]["@id"]));
												}
											}
										});
									} else { 
										console.log("Found work without segmentLine or partonomy! ", work); 
									}
								}
							});
						}
					});
				}
			});
		});
	}
}

export function fetchStructure(target, parts, segline) {
	return(dispatch) => {
		dispatch({
			type: FETCH_STRUCTURE,
			payload: { 
				target: target,
				parts: parts,
				structure: segline 
			}
		});
		axios.get(segline).then((data) => { 
			jsonld.fromRDF(data.data, (err, doc) => {
				if(err) { console.log("ERROR TRANSLATING NQUADS TO JSONLD: ", err, data.data) }
				else { 
					// frame the doc in terms of each part of the expression targetted by the annotation
					parts.map((part) => {
						jsonld.frame(doc, { "@id": part}, (err, framed) => {
							if(err) { console.log("FRAMING ERROR in fetchStructure: ", err) }
							else { 
								jsonld.compact(framed, context, (err, compacted) => { 
									if(err) { console.log("COMPACTING ERROR in fetchStructure:", err) }
									else { 
										// and hand to reducers to process associated embodibags
										// (manifestations of the expression)
										console.log("fetching manifestations", doc, target, part, compacted);
										dispatch({ 
											type: FETCH_MANIFESTATIONS,
											payload: { 
												target: target,
												part: compacted
											}
										});
									}
								});
							}
						});
					});
				}
			});
		});
	}
}

export function fetchConceptualScore(uri) { 
	console.log("FETCH_CONCEPTUAL_SCORE ON URI: ", uri);
	const promise = axios.get(uri, {headers: {'Accept': 'application/ld+json'}});

    return (dispatch) => { 
        promise.then( (response) => { 
			const framed = response.data;
			const conceptualScore = framed["@graph"][0];
			if("mo:published_as" in conceptualScore) { 
				// dispatch the conceptual score (containing the mei URI) so that we can initialise a <Score> component
				dispatch( { 
					type: FETCH_CONCEPTUAL_SCORE,
					payload: conceptualScore 
				});
				dispatch(fetchScore(conceptualScore["mo:published_as"]["@id"]));
			} else { console.log("Unpublished conceptual score: ", conceptualScore) }
		})
	}
}

export function scorePageToComponentTarget(target, pubScoreUri, MEI) {
	return { 
		type: SCORE_PAGE_TO_TARGET,
		payload: { 
			data: MEI,
			uri: pubScoreUri,
			target: target
		}
	}
}

export function scorePrevPage(pubScoreUri, pageNum, MEI) { 
	return (dispatch) => {
		dispatch({
			type: SCORE_PREV_PAGE,
			payload: { 
				pageNum: pageNum,
				data: MEI,
				uri: pubScoreUri
			}
		});
	}
}

export function scoreNextPageStatic(pubScoreUri, pageNum, MEI) { 
	return (dispatch) => {
		dispatch({
			type: SCORE_NEXT_PAGE,
			payload: { 
				pageNum: pageNum,
				data: MEI,
				uri: pubScoreUri
			}
		});
	}
}
export function scoreNextPage(session, nextSession, etag, annotation, pubScoreUri, pageNum, MEI) { 
	return (dispatch) => {
		if(MEI) { 
			const action = {
				type: SCORE_NEXT_PAGE,
				payload: { 
					pageNum: pageNum,
					data: MEI,
					uri: pubScoreUri, 
					nextSession: nextSession
				}
			};
			dispatch( 
				patchAndProcessAnnotation(action, session, etag, annotation)
			);
		} else { 
			dispatch({
				type: ANNOTATION_NOT_HANDLED,
				payload:"Page flip attempted on non-existing MEI. Has it loaded yet?"
			})
		}
	}
}

export function transitionToSession(thisSession, nextSession) { 	
	// TODO do this properly using react.router to avoid full reload
	window.location.assign('/Climb?session=' + nextSession)
	return { 
		type: ANNOTATION_HANDLED 
	}
}

export function resetNextSessionTrigger() { 
	return { 
		type: RESET_NEXT_SESSION_TRIGGER
	}
}

export function postNextPageAnnotation(session, etag) { 
	return (dispatch) => {
		dispatch(
			postAnnotation(session, etag, JSON.stringify({
				"oa:hasTarget": { "@id": session },
				"oa:motivatedBy": { "@id": "motivation:nextPageOrPiece" }
			}))
		)
	}
}

export function postAnnotation(session, etag, json) {
	console.log("Posting annotation: ", session, etag, json)
	axios.post(
		session, 
		json, 
		{ headers: {'Content-Type': 'application/ld+json', 'If-None-Match':etag} }
	).catch(function (error) { 
		if(error.response.status == 412) {
			console.log("Mid-air collision while attempting to post annotation. Retrying.");
			// GET the session resource to figure out new etag
			axios.get(session).then( (response) => {
				// and try again
				return (dispatch) => { 
					dispatch(postAnnotation(session, response.headers.etag, json));
				}
			});
		} else { 
			console.log("Error while posting annotation: ", error);
			console.log("Retrying.");
			return (dispatch) => { 
				dispatch(postAnnotation(session, etag, json));
			}
		}	
	});

	return { 
		type: ANNOTATION_POSTED
	}
}

export function markAnnotationProcessed(session, etag, annotation) {
	console.log("PATCHING: ", session, etag, annotation);
	const patchJson = JSON.stringify( { 
		"@id": annotation["@id"],
		"meld:state": {"@id": "meld:processed"}
	});
	axios.patch(
		session,
		patchJson,
		{ headers: {'Content-Type': 'application/ld+json', 'If-None-Match':etag} }
	).catch(function (error) { 
		if(error.response.status == 412) {
			console.log("Mid-air collision while attempting to patch annotation. Retrying.");
			// GET the session resource to figure out new etag
			axios.get(session).then( (response) => {
				// and try again
				return (dispatch) => { 
					dispatch(markAnnotationProcessed(session, response.headers.etag, annotation));
				}
			});
		} else { 
			console.log("Error while patching annotation: ", error);
			console.log("Retrying.");
			return (dispatch) => { 
				dispatch(markAnnotationProcessed(session, etag, json));
			}
		}	
	}).then("Done?");

	return { 
		type: ANNOTATION_PATCHED
	}
}

export function patchAndProcessAnnotation(action, session, etag, annotation) {
	console.log("PATCHING: ", session, etag, annotation);
	const patchJson = JSON.stringify( { 
		"@id": annotation["@id"],
		"meld:state": {"@id": "meld:processed"}
	});
	return (dispatch) => {
		axios.patch(
			session,
			patchJson,
			{ headers: {'Content-Type': 'application/ld+json', 'If-None-Match':etag} }
		).then( function (response) {
			console.log("Dispatching action: ", action);
			dispatch(action);
		}).catch(function (error) { 
			if(error.response.status == 412) {
				console.log("Mid-air collision while attempting to patch annotation. Retrying.");
				// GET the session resource to figure out new etag
				axios.get(session).then( (response) => {
					// and try again
					return (dispatch) => { 
						dispatch(patchAndProcessAnnotation(action, session, response.headers.etag, annotation));
					}
				});
			} else { 
				console.log("Error while patching annotation: ", error);
				console.log("Retrying.");
				return (dispatch) => { 
					dispatch(patchAndProcessAnnotation(action, session, etag, json));
				}
			}	
		});

		return dispatch({ 
			type: ANNOTATION_PATCHED
		})
	}
}


export function updateMuzicodes(muzicodesUri, session) {
	// inform the muzicodes service that our session has loaded
	axios.post(muzicodesUri, session);
	return ({ 
		type: MUZICODES_UPDATED
	})
}

// helper function to ensure that a given key of a JSON obj
// is an array, rather than a single value
// this is so that we can use the same approach for one and for
// many values
export function ensureArray(theObj, theKey) { 
	if(theObj !== null && typeof theObj === 'object') { 
		if(!theKey in theObj) { 
			console.log("ensureArray: KEY NOT IN OBJECT!", theKey, theObj);
		}
		else if(!Array.isArray(theObj[theKey])) { 
			theObj[theKey] = [theObj[theKey]];
		}
		return theObj;
	} else { 
		console.log("ensureArray: Provided structure is NOT AN OBJECT!") 
	}
}

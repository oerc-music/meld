import update from 'immutability-helper';
import { 
	FETCH_GRAPH, 
	FETCH_COMPONENT_TARGET, 
	SESSION_GRAPH_ETAG,
	ensureArray
} from '../actions/index'
import { QUEUE_NEXT_SESSION } from '../actions/meldActions'

const INIT_STATE = {
    graph: { 
        annoGraph: {}, 
        targetsById: {}, 
        targetsByType: {}
    },
	etags: {},
	nextSession: ""
}

export default function(state = INIT_STATE, action) { 
	switch (action.type) { 
	/*
	case FETCH_GRAPH:
        let byId = {};
        let byType = {};
		let payload = action.payload;
		if(typeof payload === "string") { 
			payload = JSON.parse(payload);
		}
		if(CONTAINS in payload["@graph"]) { 
			payload["@graph"]["ldp:contains"].map( (a) => {
				a["oa:hasTarget"].map( (targetResource) => { 
					// lookup target IDs to get types and component annotations
					if(targetResource["@id"] in byId) { 
						byId[targetResource["@id"]]["annotations"].push(a["oa:hasBody"]);
					} else { 
						byId[targetResource["@id"]] = {
							"type": targetResource["@type"],
							"annotations": a["oa:hasBody"]
						}
					}
					// lookup target type to get target ID
					if(targetResource["@type"] in byType) { 
						byType[targetResource["@type"]].push({ [targetResource["@id"]]: true });
					} else { 
						byType[targetResource["@type"]] = [{ [targetResource["@id"]]: true }];
					}
				});
			});
		} else { console.log("Graph contains no annotations: ", payload)};
		return update(state, {
            annoGraph: { $set: payload },
            targetsById: { $set: byId },
            targetsByType: { $set: byType }
        });
	*/
	case FETCH_GRAPH:
		//FIXME homogenise with old FETCH_GRAPH (above). Mostly involves broken json-ld expansion
		let byId = {}
		let byType = {}
		let payload = action.payload;
		if(typeof payload === "string") { 
			payload = JSON.parse(payload);
		}
		console.log("Hello from FETCH_GRAPH. Action is: ", action);
		payload = ensureArray(payload, "@graph");
		console.log("Looking at ", payload);
		payload = payload["@graph"][0];
		if("ldp:contains" in payload) {
			payload = ensureArray(payload, "ldp:contains");
			payload["ldp:contains"].map( (a) => { 
				if("meld:state" in a && a["meld:state"]["@id"] == "meld:processed") { 
					// skip annotations that have already been processed
					return
				}
				a = ensureArray(a, "oa:hasTarget");
				a["oa:hasTarget"].map( (targetResource) => {
					// lookup target IDs to get types and component annotations
					if(targetResource["@id"] in byId) { 
						console.log("Trying to push:", byId[targetResource["@id"]]["annotations"]);
						byId[targetResource["@id"]]["annotations"].push(a);
					} else { 
						byId[targetResource["@id"]] = {
							"type": targetResource["@type"],
							"annotations": [a] 
						}
					}
					// lookup target type to get target ID
					if(targetResource["@type"] in byType) { 
						byType[targetResource["@type"]].push({ [targetResource["@id"]]: true });
					} else { 
						byType[targetResource["@type"]] = [{ [targetResource["@id"]]: true }];
					}
					
				});
			});
		} else { console.log("Graph contains no annotations: ", payload)};
		return update(state, {
            annoGraph: { $set: payload },
            targetsById: { $set: byId },
            targetsByType: { $set: byType }
        });
	case SESSION_GRAPH_ETAG:
		console.log("GOT SESSION_GRAPH_ETAG ", action.payload.etag)
		return update(state, {
			etags: {
				$set: { [action.payload.uri]: action.payload.etag }
			}
		}); 		
	case QUEUE_NEXT_SESSION:
		console.log("Setting next session: ", action.payload);
		return update(state, { 
			nextSession: { $set: action.payload }
		});
	default:
		return state;
	}
}

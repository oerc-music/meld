import update from 'immutability-helper';
import { CUE_AUDIO_HANDLED } from '../actions/index';

export default function(state = { "audioCuePos": null }, action) { 
	switch (action.type) { 
	case CUE_AUDIO_HANDLED:
		console.log("HELLO FOM APP REDUCER");
		return update(state, { $set: { "audioCuePos": action.payload } });
	default:
		return state; 
	}
}

import ReactDOM from 'react-dom';

import { patchAndProcessAnnotation } from './index'

export const MARKUP_EMPHASIS = "meldterm:emphasis";
export const MARKUP_HIGHLIGHT = "meldterm:highlight";
export const MARKUP_HIGHLIGHT2 = "meldterm:highlight2";
export const CUE_AUDIO = "meldterm:CueAudio";
export const CUE_AUDIO_HANDLED = "CUE_AUDIO_HANDLED";
export const CUE_IMAGE = "meldterm:CueImage";
export const CUE_IMAGE_HANDLED = "CUE_IMAGE_HANDLED";
export const NEXT_PAGE_OR_PIECE = "motivation:NextPageOrPiece";
export const ANNOTATION_HANDLED = "ANNOTATION_HANDLED";
export const ANNOTATION_NOT_HANDLED = "ANNOTATION_NOT_HANDLED";
export const ANNOTATION_PATCHED = "ANNOTATION_PATCHED";
export const ANNOTATION_POSTED = "ANNOTATION_POSTED";
export const QUEUE_NEXT_SESSION = "QUEUE_NEXT_SESSION";

export function handleCueImage(component, annotation, uri, fragments, fragImages) {
	const haveImages = fragments.filter((f) => f in fragImages);
	if(!haveImages.length) { 
		return annotationNotHandled(annotation)
	}
	haveImages.map((f) => {
		const fLocalId = f.substr(f.indexOf("#"))
		const element = component.querySelector(fLocalId);
		const myImage = fragImages[f];
		element.onclick = function() { 
			let images = document.querySelectorAll("img");
			Array.prototype.map.call(images, function(i) { i.style.visibility="hidden" });
			const query = "img[src='" + myImage + "']";
			document.querySelector(query).style.visibility ="visible";
		}
	});
	return annotationHandled(annotation)
}	

export function TEIScroll(element){
  if(element.closest('svg')) {
    var targetClass = false;
    for(var c=0; c<element.classList.length; c++){
      if(element.classList[c].indexOf("__")>-1){
        targetClass = element.classList[c];
        var targetElements = document.getElementsByClassName(targetClass);
        for(var i=0; i<targetElements.length; i++){
          var textBox = targetElements[i].closest('.TEIContainer');
          if(textBox){
           targetElements[i].scrollIntoView;
           textBox.scrollTop = textBox.offsetTop + targetElements[i].offsetTop  - (textBox.clientHeight / 2);
          }
        }
        return true;
      }
    }
  }
  return true;
}

export function handleCueAudio(component, annotation, body, uri, fragments) { 
    if("MEI" in fragments && "Audio" in fragments) { 
        fragments.MEI.map((f) => { 
            const fLocalId = f.substr(f.indexOf("#"))
            const element = component.querySelector(fLocalId);
            if (element) { 
                //TODO figure out what to do with multiple audio fragments
                const audioUri = fragments.Audio[0].split("#")[0];
                const audioFrag = fragments.Audio[0].split("#")[1];
                const audioFragTime = parseFloat(audioFrag.substr(audioFrag.indexOf("t=")+2))
                element.onclick = function() { 
                    TEIScroll(element);
                    const query = "audio[data-uri='" + audioUri + "']";
                    let myPlayers = document.querySelectorAll(query);
                    Array.prototype.map.call(myPlayers, function(p) { p.currentTime = audioFragTime });
                };
                applyAnnotationId(element, annotation);
            }
        });
        return annotationHandled(annotation);
    }
    console.log("Cannot handle cue audio without MEI and audio fragments!", fragments);
    return annotationNotHandled(annotation);
}

export function handleEmphasis(component, annotation, uri, fragments) {
	assignClass("meld-emphasis", component, annotation, uri, fragments);
}

export function handleHighlight(component, annotation, uri, fragments) {
	assignClass("meld-highlight", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleHighlight2(component, annotation, uri, fragments) {
	assignClass("meld-highlight2", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleIdentifyMuzicode(component, annotation, uri, fragments) { 
	assignClass("meld-muzicode-identify", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleChoiceMuzicode(component, annotation, uri, fragments) { 
	console.log("CHOICE!");
	assignClass("meld-muzicode-choice", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleChallengePassed(component, annotation, uri, fragments) { 
	assignClass("meld-muzicode-challenge-passed", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleDisklavierStart(component, annotation, uri, fragments) { 
	assignClass("meld-muzicode-disklavier-start", component, annotation, uri, fragments);
	return annotationHandled();
}

export function handleQueueNextSession(session, etag, annotation) {
	console.log("Queueing next session: ", annotation);
	return (dispatch) => { 
		const action = {
			type: QUEUE_NEXT_SESSION,
			payload: annotation["oa:hasBody"]["@id"]
		}
		dispatch(patchAndProcessAnnotation(action, session, etag, annotation));
	}
}

function annotationHandled(annotation) {
	return {
		type: ANNOTATION_HANDLED,
		payload: annotation
	}
}

function annotationNotHandled(annotation) {
	return {
		type: ANNOTATION_NOT_HANDLED,
		payload: annotation
	}
}

function applyAnnotationId(element, annotation) {
	// stamp this element with the specified annotation id
	const id = annotation["@id"].replace(":", "__");
	if(!element.classList.contains(id)) { 
		element.classList.add(id);
	}
}

function assignClass(className, component, annotation, uri, fragments) { 
	fragments.map((f) => {  
		const fLocalId = f.substr(f.indexOf("#"))
		const element = component.querySelector(fLocalId);
		if (element) { 
			if(!element.classList.contains(className)) {
				element.classList.add(className);
			}
			applyAnnotationId(element, annotation);
			element.onmouseover = function(){ 
				let highlighted = document.querySelectorAll("."+className);
				Array.prototype.map.call(highlighted, function(em) { em.classList.add("infocus")});
			}
			element.onmouseleave = function(){ 
				let highlighted= document.querySelectorAll("."+className);
				Array.prototype.map.call(highlighted, function(em) { em.classList.remove("infocus")});
			}
		}
	});
}

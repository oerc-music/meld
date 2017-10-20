const initialState = {  
    data: ""  
};

export default function (state = initialState, action) {  
    switch (action.type) {
    case "DATA_FETCH_SUCCESS": {
        return { data: action.payload }
    }
    default:
        return state;
	}
}

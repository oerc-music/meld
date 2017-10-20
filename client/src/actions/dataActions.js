import axios from 'axios'
export function dataFetch(uri) {  
	return (dispatch) => {
		console.log("Ohi")
		axios.get(uri).then( (data) => { 
			dispatch({
				type: "DATA_FETCH_SUCCESS",
				payload: data.data
			})
		})
	}
}

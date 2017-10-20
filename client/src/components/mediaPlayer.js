import React, {Component} from 'react';
import {Media, Player, controls} from 'react-media-player';
const { PlayPause, CurrentTime, Progress, SeekBar, Duration, MuteUnmute, Volume, Fullscreen} = controls;

class MediaPlayer extends Component { 
	render() {
        console.log("MEDIA PLAYER HAS PROPS: ", this.props);
		return (
			<Media>
				<div className="media">
					<div className = "media-player">
						<Player src={this.props.uri} />
					</div>
					<div className="media-controls">
						<PlayPause/>
						<CurrentTime/>
						{/* <Progress/> */}
						<SeekBar/>
						<Duration/>
						<MuteUnmute/>
						<Volume/>
						<Fullscreen/>
					</div>
				</div>
			</Media>
		);
	}
}

export default MediaPlayer

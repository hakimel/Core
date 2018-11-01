/**
 * Core
 * MIT licensed
 *
 * Copyright (C) 2018 Hakim El Hattab, http://hakim.se
 */
var Core = new function(){

	// Flags if we are running mobile mode
	var isMobile = !!navigator.userAgent.toLowerCase().match( /ipod|ipad|iphone|android/gi );

	var DEFAULT_WIDTH = 1000,
		DEFAULT_HEIGHT = 650,
		BORDER_WIDTH = 6,
		FRAMERATE = 60;

	// Types of organisms
	var ORGANISM_ENEMY = 'enemy',
		ORGANISM_ENERGY = 'energy';

	// The world dimensions
	var world = {
		width: isMobile ? window.innerWidth : DEFAULT_WIDTH,
		height: isMobile ? window.innerHeight : DEFAULT_HEIGHT
	};

	var canvas,
		context;

	var canvasBackground,
		contextBackground;

	// UI DOM elements
	var status;
	var panels;
	var message;
	var title;
	var startButton;

	// Game elements
	var organisms = [];
	var particles = [];
	var player;

	// Mouse properties
	var mouseX = (window.innerWidth + world.width) * 0.5;
	var mouseY = (window.innerHeight + world.height) * 0.5;
	var mouseIsDown = false;
	var spaceIsDown = false;

	// Game properties and scoring
	var playing = false;
	var score = 0;
	var time = 0;
	var duration = 0;
	var difficulty = 1;
	var lastspawn = 0;

	// Game statistics
	var fc = 0; // Frame count
	var fs = 0; // Frame score
	var cs = 0; // Collision score

	// The world's velocity
	var velocity = { x: -1.3, y: 1 };

	// Performance (FPS) tracking
	var fps = 0;
	var fpsMin = 1000;
	var fpsMax = 0;
	var timeLastSecond = new Date().getTime();
	var frames = 0;

	this.init = function(){

		canvas = document.getElementById('world');
		canvasBackground = document.getElementById('background');
		panels = document.getElementById('panels');
		status = document.getElementById('status');
		message = document.getElementById('message');
		title = document.getElementById('title');
		startButton = document.getElementById('startButton');

		if (canvas && canvas.getContext) {
			context = canvas.getContext('2d');

			contextBackground = canvasBackground.getContext('2d');

			// Register event listeners
			document.addEventListener('mousemove', documentMouseMoveHandler, false);
			document.addEventListener('mousedown', documentMouseDownHandler, false);
			document.addEventListener('mouseup', documentMouseUpHandler, false);
			canvas.addEventListener('touchstart', documentTouchStartHandler, false);
			document.addEventListener('touchmove', documentTouchMoveHandler, false);
			document.addEventListener('touchend', documentTouchEndHandler, false);
			window.addEventListener('resize', windowResizeHandler, false);
			startButton.addEventListener('click', startButtonClickHandler, false);
			document.addEventListener('keydown', documentKeyDownHandler, false);
			document.addEventListener('keyup', documentKeyUpHandler, false);

			// Define our player
			player = new Player();

			// Force an initial resize to make sure the UI is sized correctly
			windowResizeHandler();

			// If we are running on mobile, certain elements need to be configured differently
			if( isMobile ) {
				status.style.width = world.width + 'px';
				canvas.style.border = 'none';
			}

			animate();
		}
	};

	function renderBackground() {
		var gradient = contextBackground.createRadialGradient( world.width * 0.5, world.height * 0.5, 0, world.width * 0.5, world.height * 0.5, 500 );
		gradient.addColorStop(0,'rgba(0, 70, 70, 1)');
		gradient.addColorStop(1,'rgba(0, 8, 14, 1)');

		contextBackground.fillStyle = gradient;
		contextBackground.fillRect( 0, 0, world.width, world.height );
	}

	/**
	 * Handles click on the start button in the UI.
	 */
	function startButtonClickHandler(event){
		if( playing == false ) {
			playing = true;

			// Reset game properties
			organisms = [];
			score = 0;
			difficulty = 1;

			// Reset game tracking properties
			fc = 0;
			fs = 0;
			ms = 0;
			cs = 0;

			// Reset the player data
			player.energy = 30;

			// Hide the game UI
			panels.style.display = 'none';
			status.style.display = 'block';

			time = new Date().getTime();
		}
	}

	/**
	 * Stops the currently ongoing game and shows the
	 * resulting data in the UI.
	 */
	function gameOver() {
		playing = false;

		// Determine the duration of the game
		duration = new Date().getTime() - time;

		// Show the UI
		panels.style.display = 'block';

		// Ensure that the score is an integer
		score = Math.round(score);

		// Write the users score to the UI
		title.innerHTML = 'Game Over! (' + score + ' points)';

		// Update the status bar with the final score and time
		scoreText = 'Score: <span>' + Math.round( score ) + '</span>';
		scoreText += ' Time: <span>' + Math.round( ( ( new Date().getTime() - time ) / 1000 ) * 100 ) / 100 + 's</span>';
		status.innerHTML = scoreText;
	}

	function documentKeyDownHandler(event) {
		switch( event.keyCode ) {
			case 32:
				if( !spaceIsDown && player.energy > 15 ) {
					player.energy -= 4;
				}
				spaceIsDown = true;
				event.preventDefault();
				break;
		}
	}
	function documentKeyUpHandler(event) {
		switch( event.keyCode ) {
			case 32:
				spaceIsDown = false;
				event.preventDefault();
				break;
		}
	}

	/**
	 * Event handler for document.onmousemove.
	 */
	function documentMouseMoveHandler(event){
		mouseX = event.clientX - (window.innerWidth - world.width) * 0.5 - BORDER_WIDTH;
		mouseY = event.clientY - (window.innerHeight - world.height) * 0.5 - BORDER_WIDTH;
	}

	/**
	 * Event handler for document.onmousedown.
	 */
	function documentMouseDownHandler(event){
		mouseIsDown = true;
	}

	/**
	 * Event handler for document.onmouseup.
	 */
	function documentMouseUpHandler(event) {
		mouseIsDown = false;
	}

	/**
	 * Event handler for document.ontouchstart.
	 */
	function documentTouchStartHandler(event) {
		if(event.touches.length == 1) {
			event.preventDefault();

			mouseX = event.touches[0].pageX - (window.innerWidth - world.width) * 0.5;
			mouseY = event.touches[0].pageY - (window.innerHeight - world.height) * 0.5;

			mouseIsDown = true;
		}
	}

	/**
	 * Event handler for document.ontouchmove.
	 */
	function documentTouchMoveHandler(event) {
		if(event.touches.length == 1) {
			event.preventDefault();

			mouseX = event.touches[0].pageX - (window.innerWidth - world.width) * 0.5 - 60;
			mouseY = event.touches[0].pageY - (window.innerHeight - world.height) * 0.5 - 30;
		}
	}

	/**
	 * Event handler for document.ontouchend.
	 */
	function documentTouchEndHandler(event) {
		mouseIsDown = false;
	}

	/**
	 * Event handler for window.onresize.
	 */
	function windowResizeHandler() {
		// Update the game size
		world.width = isMobile ? window.innerWidth : DEFAULT_WIDTH;
		world.height = isMobile ? window.innerHeight : DEFAULT_HEIGHT;

		// Center the player
		player.position.x = world.width * 0.5;
		player.position.y = world.height * 0.5;

		// Resize the canvas
		canvas.width = world.width;
		canvas.height = world.height;
		canvasBackground.width = world.width;
		canvasBackground.height = world.height;

		// Determine the x/y position of the canvas
		var cvx = (window.innerWidth - world.width) * 0.5;
		var cvy = (window.innerHeight - world.height) * 0.5;

		// Position the canvas
		canvas.style.position = 'absolute';
		canvas.style.left = cvx + 'px';
		canvas.style.top = cvy + 'px';
		canvasBackground.style.position = 'absolute';
		canvasBackground.style.left = cvx + BORDER_WIDTH + 'px';
		canvasBackground.style.top = cvy + BORDER_WIDTH + 'px';

		if( isMobile ) {
			panels.style.left = '0px';
			panels.style.top = '0px';
			panels.style.width = '100%';
			panels.style.height = '100%';
			status.style.left = '0px';
			status.style.top = '0px';
		}
		else {
			panels.style.left = cvx + BORDER_WIDTH + 'px';
			panels.style.top = cvy + BORDER_WIDTH + 'px';
			panels.style.width = world.width + 'px';
			panels.style.height = world.height + 'px';
			status.style.left = cvx + BORDER_WIDTH + 'px';
			status.style.top = cvy + BORDER_WIDTH + 'px';
		}

		renderBackground();
	}

	/**
	 * Emits a random number of particles from a set point.
	 *
	 * @param position The point where particles will be
	 * emitted from
	 * @param spread The pixel spread of the emittal
	 */
	function emitParticles( position, direction, spread, seed ) {
		var q = seed + ( Math.random() * seed );

		while( --q >= 0 ) {
			var p = new Point();
			p.position.x = position.x + ( Math.sin(q) * spread );
			p.position.y = position.y + ( Math.cos(q) * spread );
			p.velocity = { x: direction.x + ( -1 + Math.random() * 2 ), y: direction.y + ( - 1 + Math.random() * 2 ) };
			p.alpha = 1;

			particles.push( p );
		}
	}

	/**
	 * Called on every frame to update the game properties
	 * and render the current state to the canvas.
	 */
	function animate() {

		// Fetch the current time for this frame
		var frameTime = new Date().getTime();

		// Increase the frame count
		frames ++;

		// Check if a second has passed since the last time we updated the FPS
		if( frameTime > timeLastSecond + 1000 ) {
			// Establish the current, minimum and maximum FPS
			fps = Math.min( Math.round( ( frames * 1000 ) / ( frameTime - timeLastSecond ) ), FRAMERATE );
			fpsMin = Math.min( fpsMin, fps );
			fpsMax = Math.max( fpsMax, fps );

			timeLastSecond = frameTime;
			frames = 0;
		}

		// A factor by which the score will be scaled, depending on current FPS
		var scoreFactor = 0.01 + ( Math.max( Math.min( fps, FRAMERATE ), 0 ) / FRAMERATE * 0.99 );

		// Scales down the factor by itself
		scoreFactor = scoreFactor * scoreFactor;

		// Clear the canvas of all old pixel data
		context.clearRect(0,0,canvas.width,canvas.height);

		var i,
			ilen,
			j,
			jlen;

		// Only update game properties and draw the player if a game is active
		if( playing ) {

			// Increment the difficulty slightly
			difficulty += 0.0015;

			// Increment the score depending on difficulty
			score += (0.4 * difficulty) * scoreFactor;

			// Increase the game frame count stat
			fc ++;

			// Increase the score count stats
			fs += (0.4 * difficulty) * scoreFactor;

			//player.angle = Math.atan2( mouseY - player.position.y, mouseX - player.position.x );

			var targetAngle = Math.atan2( mouseY - player.position.y, mouseX - player.position.x );

			if( Math.abs( targetAngle - player.angle ) > Math.PI ) {
				player.angle = targetAngle;
			}

			player.angle += ( targetAngle - player.angle ) * 0.2;

			player.energyRadiusTarget = ( player.energy / 100 ) * ( player.radius * 0.8 );
			player.energyRadius += ( player.energyRadiusTarget - player.energyRadius ) * 0.2;

			player.shield = { x: player.position.x + Math.cos( player.angle ) * player.radius, y: player.position.y + Math.sin( player.angle ) * player.radius };

			// Shield
			context.beginPath();
			context.strokeStyle = '#648d93';
			context.lineWidth = 3;
			context.arc( player.position.x, player.position.y, player.radius, player.angle + 1.6, player.angle - 1.6, true );
			context.stroke();

			// Core
			context.beginPath();
			context.fillStyle = "#249d93";
			context.strokeStyle = "#3be2d4";
			context.lineWidth = 1.5;

			player.updateCore();

			var loopedNodes = player.coreNodes.concat();
			loopedNodes.push( player.coreNodes[0] );

			for( var i = 0; i < loopedNodes.length; i++ ) {
				p = loopedNodes[i];
				p2 = loopedNodes[i+1];

				p.position.x += ( (player.position.x + p.normal.x + p.offset.x) - p.position.x ) * 0.2;
				p.position.y += ( (player.position.y + p.normal.y + p.offset.y) - p.position.y ) * 0.2;

				if( i == 0 ) {
					// This is the first loop, so we need to start by moving into position
					context.moveTo( p.position.x, p.position.y );
				}
				else if( p2 ) {
					// Draw a curve between the current and next trail point
					context.quadraticCurveTo( p.position.x, p.position.y, p.position.x + ( p2.position.x - p.position.x ) / 2, p.position.y + ( p2.position.y - p.position.y ) / 2 );
				}
			}

			context.closePath();
			context.fill();
			context.stroke();

		}

		if( spaceIsDown && player.energy > 10 ) {
			player.energy -= 0.1;

			context.beginPath();
			context.strokeStyle = '#648d93';
			context.lineWidth = 1;
			context.fillStyle = 'rgba( 0, 100, 100, ' + ( player.energy / 100 ) * 0.9 + ' )';
			context.arc( player.position.x, player.position.y, player.radius, 0, Math.PI*2, true );
			context.fill();
			context.stroke();

			// play sound for the shield
			CoreAudio.playShield();
		}

		var enemyCount = 0;
		var energyCount = 0;

		// Go through each enemy and draw it + update its properties
		for( i = 0; i < organisms.length; i++ ) {
			p = organisms[i];

			p.position.x += p.velocity.x;
			p.position.y += p.velocity.y;

			p.alpha += ( 1 - p.alpha ) * 0.1;

			if( p.type == ORGANISM_ENEMY ) context.fillStyle = 'rgba( 255, 0, 0, ' + p.alpha + ' )';
			if( p.type == ORGANISM_ENERGY ) context.fillStyle = 'rgba( 0, 235, 190, ' + p.alpha + ' )';

			context.beginPath();
			context.arc(p.position.x, p.position.y, p.size/2, 0, Math.PI*2, true);
			context.fill();

			var angle = Math.atan2( p.position.y - player.position.y, p.position.x - player.position.x );

			if (playing) {

				var dist = Math.abs( angle - player.angle );

				if( dist > Math.PI ) {
					dist = ( Math.PI * 2 ) - dist;
				}

				if ( dist < 1.6 ) {
					if (p.distanceTo(player.position) > player.radius - 5 && p.distanceTo(player.position) < player.radius + 5) {
						p.dead = true;

						// play sound
						CoreAudio.organismDead();
					}
				}

				if (spaceIsDown && p.distanceTo(player.position) < player.radius && player.energy > 11) {
					p.dead = true;
					score += 4;
				}

				if (p.distanceTo(player.position) < player.energyRadius + (p.size * 0.5)) {
					if (p.type == ORGANISM_ENEMY) {
						player.energy -= 6;

						// play sound
						CoreAudio.energyDown();
					}

					if (p.type == ORGANISM_ENERGY) {
						player.energy += 8;
						score += 30;

						// play sound
						CoreAudio.energyUp();
					}

					player.energy = Math.max(Math.min(player.energy, 100), 0);

					p.dead = true;
				}
			}

			// If the enemy is outside of the game bounds, destroy it
			if( p.position.x < -p.size || p.position.x > world.width + p.size || p.position.y < -p.size || p.position.y > world.height + p.size ) {
				p.dead = true;
			}

			// If the enemy is dead, remove it
			if( p.dead ) {
				emitParticles( p.position, { x: (p.position.x - player.position.x) * 0.02, y: (p.position.y - player.position.y) * 0.02 }, 5, 5 );

				organisms.splice( i, 1 );
				i --;
			}
			else {
				if( p.type == ORGANISM_ENEMY ) enemyCount ++;
				if( p.type == ORGANISM_ENERGY ) energyCount ++;
			}
		}

		// If there are less enemies than intended for this difficulty, add another one
		if( enemyCount < 1 * difficulty && new Date().getTime() - lastspawn > 100 ) {
			organisms.push( giveLife( new Enemy() ) );
			lastspawn = new Date().getTime();
		}

		//
		if( energyCount < 1 && Math.random() > 0.996 ) {
			organisms.push( giveLife( new Energy() ) );
		}

		// Go through and draw all particle effects
		for( i = 0; i < particles.length; i++ ) {
			p = particles[i];

			// Apply velocity to the particle
			p.position.x += p.velocity.x;
			p.position.y += p.velocity.y;

			// Fade out
			p.alpha -= 0.02;

			// Draw the particle
			context.fillStyle = 'rgba(255,255,255,'+Math.max(p.alpha,0)+')';
			context.fillRect( p.position.x, p.position.y, 1, 1 );

			// If the particle is faded out to less than zero, remove it
			if( p.alpha <= 0 ) {
				particles.splice( i, 1 );
			}
		}

		// If the game is active, update the game status bar with score, duration and FPS
		if( playing ) {
			scoreText = 'Score: <span>' + Math.round( score ) + '</span>';
			scoreText += ' Time: <span>' + Math.round( ( ( new Date().getTime() - time ) / 1000 ) * 100 ) / 100 + 's</span>';
			scoreText += ' <p class="fps">FPS: <span>' + Math.round( fps ) + ' ('+Math.round(Math.max(Math.min(fps/FRAMERATE, FRAMERATE), 0)*100)+'%)</span></p>';
			status.innerHTML = scoreText;

			if( player.energy === 0 ) {
				emitParticles( player.position, { x: 0, y: 0 }, 10, 40 );

				gameOver();

				// play sound
				CoreAudio.playGameOver();
			}
		}

		requestAnimFrame( animate );
	}

	/**
	 *
	 */
	function giveLife( organism ) {
		var side = Math.round( Math.random() * 3 );

		switch( side ) {
			case 0:
				organism.position.x = 10;
				organism.position.y = world.height * Math.random();
				break;
			case 1:
				organism.position.x = world.width * Math.random();
				organism.position.y = 10;
				break;
			case 2:
				organism.position.x = world.width - 10;
				organism.position.y = world.height * Math.random();
				break;
			case 3:
				organism.position.x = world.width * Math.random();
				organism.position.y = world.height - 10;
				break;
		}

		if( playing ) CoreAudio.playSynth( organism.position.x / world.width );

		organism.speed = Math.min( Math.max( Math.random(), 0.6 ), 0.75 );

		organism.velocity.x = ( player.position.x - organism.position.x ) * 0.006 * organism.speed;
		organism.velocity.y = ( player.position.y - organism.position.y ) * 0.006 * organism.speed;

		if( organism.type == 'enemy' ) {
			organism.velocity.x *= (1+(Math.random()*0.1));
			organism.velocity.y *= (1+(Math.random()*0.1));
		}

		organism.alpha = 0;

		return organism;
	}

};

function Point( x, y ) {
	this.position = { x: x, y: y };
}
Point.prototype.distanceTo = function(p) {
	var dx = p.x-this.position.x;
	var dy = p.y-this.position.y;
	return Math.sqrt(dx*dx + dy*dy);
};
Point.prototype.clonePosition = function() {
	return { x: this.position.x, y: this.position.y };
};

function Player() {
	this.position = { x: 0, y: 0 };
	this.length = 15;
	this.energy = 30;
	this.energyRadius = 0;
	this.energyRadiusTarget = 0;
	this.radius = 60;
	this.angle = 0;
	this.coreQuality = 16;
	this.coreNodes = [];
}
Player.prototype = new Point();
Player.prototype.updateCore = function() {
	var i, j, n;

	if( this.coreNodes.length == 0 ) {
		var i, n;

		for (i = 0; i < this.coreQuality; i++) {
			n = {
				position: { x: this.position.x, y: this.position.y },
				normal: { x: 0, y: 0 },
				normalTarget: { x: 0, y: 0 },
				offset: { x: 0, y: 0 }
			};

			this.coreNodes.push( n );
		}
	}

	for (i = 0; i < this.coreQuality; i++) {

		var n = this.coreNodes[i];

		var angle = ( i / this.coreQuality ) * Math.PI * 2;

		n.normal.x = Math.cos( angle ) * this.energyRadius;
		n.normal.y = Math.sin( angle ) * this.energyRadius;

		n.offset.x = Math.random() * 5;
		n.offset.y = Math.random() * 5;
	}
};

function Enemy() {
	this.position = { x: 0, y: 0 };
	this.velocity = { x: 0, y: 0 };
	this.size = 6 + ( Math.random() * 4 );
	this.speed = 1;
	this.type = 'enemy';
}
Enemy.prototype = new Point();

function Energy() {
	this.position = { x: 0, y: 0 };
	this.velocity = { x: 0, y: 0 };
	this.size = 10 + ( Math.random() * 6 );
	this.speed = 1;
	this.type = 'energy';
}
Energy.prototype = new Point();

// shim with setTimeout fallback from http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

Core.init();
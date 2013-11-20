/*
 * 
 * David Lettier (C) 2013.
 * 
 * http://www.lettier.com/
 * 
 * Simple Pong Learner or SimPL.
 * 
 * Single sided pong clone with only one paddle which learns to follow and collide with the ball.
 * 
 */

var request_animation_id = null;

var take_control = false;
var pause        = true;
var show_debug   = false;

var use_neural_network_paddle = true;
var use_perfect_paddle        = false;
var use_random_paddle         = false;

var run_experiment = true;

var top_wall    = new Static_Object( "top_wall"    );
var right_wall  = new Static_Object( "right_wall"  );
var bottom_wall = new Static_Object( "bottom_wall" );
var left_wall   = new Static_Object( "left_wall"   );


var ball_slot   = document.getElementById( "ball_slot" );
var paddle_slot = document.getElementById( "paddle_slot" );

var ball_reset_center   = { x: ball_slot.offsetLeft      + ( ( ball_slot.offsetWidth    || ball_slot.clientWidth    ) / 2 ),
	                       y: ball_slot.offsetTop    + ( ( ball_slot.offsetHeight   || ball_slot.clientHeight   ) / 2 )  };
var paddle_reset_center = { x: paddle_slot.offsetLeft    + ( ( paddle_slot.offsetWidth  || paddle_slot.clientWidth  ) / 2 ),
	                       y: paddle_slot.offsetTop  + ( ( paddle_slot.offsetHeight || paddle_slot.clientHeight ) / 2 )  };

var paddle_path = document.getElementById( "paddle_path" );
var ball_in_paddle_path_color     = "rgba( 200, 255, 136, .2 )";
var ball_not_in_paddle_path_color = "rgba( 255,  98,  98, .2 )";
var padddle_path_background_color = ball_in_paddle_path_color;

var random_angle_range = { min: 135, max: 225 };
var random_angle = random_angle_range.min + ( random_angle_range.max - random_angle_range.min ) * Math.random( );

var starting_magnitude        = 1000.0;
var starting_ball_magnitude   = starting_magnitude;
var starting_paddle_magnitude = starting_magnitude;
var starting_paddle_angle = 90.0;

var ball   = new Physics_Object(  new Dynamic_Object( "ball" ), random_angle, starting_ball_magnitude   );

var paddle = new Physics_Object(  new Dynamic_Object( "paddle", [ paddle_path, "t" ] ), starting_paddle_angle, starting_paddle_magnitude );

var physics_engine = new Physics_Engine( collision_handler, paddle, ball, top_wall, right_wall, bottom_wall, left_wall );

var fps_monitor = new FPS_Monitor( );

var debug_manager = new Debug_Manager( "debug" );

var database_manager = new Database_Manager( );

var neural_net_parameters = { 
	
	nInputs:                6,
	nOutputs:               1,
	nHiddenLayers:          1,
	nNeuronsPerHiddenLayer: 5,
	bias:                  -1
	
};

var genetic_algorithm_parameters = {
	
	popSize:                              10,
	nGenesPerGenome:                    null,
	useRankFitness:                    false,
	useSelfAdaptation:                 false,
	pCrMuSeq:                           true,
	iCProb:                              0.7,
	iMProb:                              0.1,
	nElite:                                2
	
};

var learner_parameters = {
			
	neural_net:               neural_net_parameters,
	genetic_algorithm: genetic_algorithm_parameters
	
};

var learner = {
	
	parameters:                learner_parameters,
	neural_net:                              null,
	neural_net_output:                       null,
	genetic_algorithm:                       null,
	evaluation_start_time:                      0,
	evaluation_end_time:                        0,
	evaluate_current_genome:                false,
	current_genome_fitness_tracking: new Array( ),
	current_genome_paddle_hits:                 0,
	current_genome_being_evalutated:            0
	
};

learner.neural_net = new Neural_Net( learner.parameters.neural_net );

learner.parameters.genetic_algorithm.nGenesPerGenome = learner.neural_net.get_number_of_weights( );

learner.genetic_algorithm = new Genetic_Algorithm( learner.parameters.genetic_algorithm );

learner.neural_net_output = 0;

// Attempt to load in the last generation from the database.

var last_generation_data_string  = "population_size=" + learner.genetic_algorithm.get_population_size( );
last_generation_data_string     += "&number_of_genes_per_genome=" + learner.genetic_algorithm.get_number_of_genes_per_genome( );

database_manager.send_and_receive( "assets/scripts/retrieve_genomes.php", last_generation_data_string, database_manager, "last_generation", false );

var last_generation = database_manager.responses[ "last_generation" ];

if ( last_generation.charAt( 0 ) != ";" )
{
	
	if ( window.confirm( "Start from previous generation?" ) )
	{

		// String received from server is generation_number;crossover_probability;mutation_probability;population_genes.
		
		var generation_number = parseInt( last_generation.split( ";" )[ 0 ] );
		
		learner.genetic_algorithm.set_generation_number( generation_number );
		
		var crossover_probability = parseFloat( last_generation.split( ";" )[ 1 ] );
		
		learner.genetic_algorithm.set_crossover_probability( crossover_probability);
		
		var mutation_probability  = parseFloat( last_generation.split( ";" )[ 2 ] );
		
		learner.genetic_algorithm.set_mutation_probability( mutation_probability );
		
		var population_genes  = last_generation.split( ";" )[ 3 ];
		
		population_genes = population_genes.split( "," );
		
		for ( var i = 0; i < population_genes.length; ++i )
		{
			
			population_genes[ i ] = parseFloat( population_genes[ i ] );
			
		}
		
		learner.genetic_algorithm.replace_population_genes( population_genes );
		
		// Set neural network weights to the first genome's genes.
		
		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
		pause = false;
		
	}
	else
	{

		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
		pause = false;
		
	}	
		
}
else
{

	learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
	
	pause = false;
	
}

var ball_style = window.getComputedStyle( ball.dynamic_object.object, null);
var ball_style_transform =  	ball_style.getPropertyValue( "-webkit-transform" ) ||
						ball_style.getPropertyValue( "-moz-transform"    ) ||
						ball_style.getPropertyValue( "-ms-transform"     ) ||
						ball_style.getPropertyValue( "-o-transform"      ) ||
						ball_style.getPropertyValue( "transform"         );
var ball_div_transform_angle    = 360;
var ball_div_transform_angle_by = 20;

function draw( time_stamp ) 
{
	
	request_animation_id = window.requestAnimationFrame( draw );
	
	var time_delta = fps_monitor.get_time_delta( time_stamp );
	
	if ( !pause )
	{
	
		debug_manager.add_or_update( "FPS", fps_monitor.get_fps( time_stamp ) );
	
		debug_manager.add_or_update( "Paddle", paddle );
		
		debug_manager.add_or_update( "Ball", ball );
	
		handle_neural_network_ouput( );
		
		debug_manager.add_or_update( "Current Genome", learner.current_genome_being_evalutated );

		debug_manager.add_or_update( "NN", learner.neural_net );
		
		debug_manager.add_or_update( "NN Weights", learner.neural_net.get_weights( ) );
		
		debug_manager.add_or_update( "GA", learner.genetic_algorithm );
	
		physics_engine.update( time_delta );
		
		// Spin the ball div to give the illusion of flying through the air.
								
		if ( ball_style_transform != undefined && ball.get_magnitude( ) != 0 )
		{
		
			ball.dynamic_object.object.style.webkitTransform = "rotate(" + ball_div_transform_angle + "deg)";
			ball.dynamic_object.object.style.MozTransform    = "rotate(" + ball_div_transform_angle + "deg)";
			ball.dynamic_object.object.style.msTransform     = "rotate(" + ball_div_transform_angle + "deg)";
			ball.dynamic_object.object.style.OTransform      = "rotate(" + ball_div_transform_angle + "deg)";
			ball.dynamic_object.object.style.transform       = "rotate(" + ball_div_transform_angle + "deg)";
			
			if ( ball.get_angle( ) >= 90 && ball.get_angle( ) <= 270 )
			{
			
				// Spin counter clock-wise if it is going towards the left of the screen.
				
				ball_div_transform_angle = ball_div_transform_angle < 0 ? 360 : ball_div_transform_angle - ( ball_div_transform_angle_by * ( ball.get_magnitude( ) / starting_ball_magnitude ) );
				
			}
			else
			{
				
				ball_div_transform_angle = ball_div_transform_angle > 360 ? 0 : ball_div_transform_angle + ( ball_div_transform_angle_by * ( ball.get_magnitude( ) / starting_ball_magnitude ) );
				
			}
			
		}
		
		// Time to evaluate the current genome?
		
		if ( learner.evaluate_current_genome )
		{
			
			handle_genome_evaluation( );
			
		}
	
		debug_manager.print( );
		
	}
	
}

// The following stub was taken from https://gist.github.com/paulirish/1579671.
			
( function ( ) 
{
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x ) 
	{
		
		window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
		window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[ vendors[ x ]+'CancelRequestAnimationFrame' ];
		
	}

	if ( !window.requestAnimationFrame )
	{
		
		window.requestAnimationFrame = function ( callback, element ) 
		{
			
			var currTime = new Date( ).getTime( );
			var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
			var id = window.setTimeout( function ( ) { callback( currTime + timeToCall ); }, timeToCall );
			lastTime = currTime + timeToCall;
			return id;
			
		};
		
	}

	if ( !window.cancelAnimationFrame )
	{
		
		window.cancelAnimationFrame = function ( id ) 
		{
			
			clearTimeout( id );
			
		};
	
	}
} ( ) );

draw( );

function reset( )
{
	
	random_angle = random_angle_range.min + ( random_angle_range.max - random_angle_range.min ) * Math.random( );
	ball.dynamic_object.set_center( ball_reset_center.x, ball_reset_center.y );
	ball.set_magnitude( starting_ball_magnitude );
	ball.set_angle( random_angle );	
		
	paddle.dynamic_object.set_center( paddle_reset_center.x, paddle_reset_center.y );
	paddle.set_magnitude( starting_ball_magnitude );
	paddle.set_angle( starting_paddle_angle );

	take_control = false;	
	pause        = false;
	
}

document.onkeyup = handle_key;

function handle_key( kevent )
{
	var key = ( window.event ) ? event.keyCode : kevent.keyCode;
	
	switch ( key )
	{
	
		case 68: // [d] key.
			
			show_debug = !show_debug
			
			if ( show_debug ) debug_manager.show_debug( );
			else debug_manager.hide_debug( );
			
			break;
			
		case 70: // [f] key.
			
			debug_div = document.getElementById( "debug" );
			
			debug_div_font_size = parseInt( window.getComputedStyle( debug_div, null).getPropertyValue( 'font-size' ), 10 );
			
			if ( window.event.shiftKey )
			{
				
				debug_div_font_size -= 1;
				
				debug_div.style.fontSize = debug_div_font_size + "px";
				
			}	
			else
			{
				
				debug_div_font_size += 1;
				
				debug_div.style.fontSize = debug_div_font_size + "px";
				
			}
			
			break;
		
		case 77: // [m] key.
			
			ball.set_magnitude( ball.get_magnitude( ) + 100 );						
			
			break;		
		
		case 80: // [p] key.
			
			pause = !pause;						
			
			break;
			
		case 82: // [r] key.
			
			reset( );
			
			break;
			
		case 84: // [t] key.
			
			take_control = !take_control;						
			
			break;
			
	}
}

document.onmousemove = handle_mouse_move;

function handle_mouse_move( mevent )
{
	
	if ( !take_control ) return null;
	
	mevent = ( window.event ) ? window.event : mevent;
	
	if ( ( mevent.clientY - ( paddle.dynamic_object.get_height( ) / 2 ) ) >= ( window.innerHeight - paddle.dynamic_object.get_height( ) ) ) 
	{ 
		
		paddle.dynamic_object.set_center( paddle.dynamic_object.get_left( ), window.innerHeight - paddle.dynamic_object.get_height( ) );
		
		return null;
		
	}
	else if ( ( mevent.clientY - ( paddle.dynamic_object.get_height( ) / 2 ) ) <= 0 )
	{ 
		
		paddle.dynamic_object.set_center( paddle.dynamic_object.get_left( ), 0 );
		
		return null;
		
	}
	
	paddle.dynamic_object.set_center( paddle.dynamic_object.get_left( ), mevent.clientY - ( paddle.dynamic_object.get_height( ) / 2 ) );
	
}

function handle_neural_network_ouput( )
{
	
	if ( take_control ) 
	{
		
		paddle.set_magnitude( 0 );
		
		paddle.set_angle( starting_paddle_angle );
		
		return null;
		
	}
	
	/* Commented out for rerun of experiment one.
	
	// To help with fitness testing, keep track of if the ball
	// is in the path of the paddle.
	// 1 for in the path of the ball.
	// Nothing for not in the path of the ball.
	//
	// In the path:
	//  ___________
	// |         0
	// |
	// |___________
	//
	// Not in the path:
	//
	//     0 
	//  ___________
	// |         
	// |
	// |___________
	//
	//
	//  ___________
	// |         
	// |
	// |___________
	//   0

	
	if ( !( ( ball.dynamic_object.get_top( ) > paddle.dynamic_object.get_bottom( ) ) || ( ball.dynamic_object.get_bottom( ) < paddle.dynamic_object.get_top( ) ) ) ) 
	{
		
		learner.current_genome_fitness_tracking.push( 1 );
		
		// Adjust paddle path visual.

		paddle_path.style.background = ball_in_paddle_path_color;
		
		
	}
	else
	{
		
		// Add nothing.
		
		// Adjust paddle path visual.

		paddle_path.style.background = ball_not_in_paddle_path_color;
		
	}
	
	*/
	
	// Experiment one tracking.
	
	learner.current_genome_fitness_tracking.push( Math.abs( paddle.dynamic_object.get_center( ).y - ball.dynamic_object.get_center( ).y ) ); 
	
	// Get input values for the neural network.
	
	var x = ball.dynamic_object.get_center( ).x - paddle.dynamic_object.get_center( ).x;
	var y = ball.dynamic_object.get_center( ).y - paddle.dynamic_object.get_center( ).y;
	
	var paddle_offset_from_ball = { x: x,
							  y: y,
							  h: Math.sqrt( ( x * x ) + ( y * y ) )
	};
	
	x = paddle.dynamic_object.get_center( ).x - 0;
	y = paddle.dynamic_object.get_center( ).y - 0;
	
	var paddle_offset_from_screen_origin = { x: x,
									 y: y,
	                                         h: Math.sqrt( ( x * x ) + ( y * y ) )
	};
	
	var ball_velocity = deep_copy( ball.get_velocity( ) );
	
	// Normalize input in [-1,1].
	
	paddle_offset_from_ball.x = paddle_offset_from_ball.x / paddle_offset_from_ball.h;
	paddle_offset_from_ball.y = paddle_offset_from_ball.y / paddle_offset_from_ball.h;

	paddle_offset_from_screen_origin.x = paddle_offset_from_screen_origin.x / paddle_offset_from_screen_origin.h;
	paddle_offset_from_screen_origin.y = paddle_offset_from_screen_origin.y / paddle_offset_from_screen_origin.h;
	
	// Turn the velocity into unit vectors.
	
	ball_velocity.x = ball_velocity.x / ball.get_magnitude( );
	ball_velocity.y = ball_velocity.y / ball.get_magnitude( );
	
	// Send in the input and get out the output which is an array.
	
	learner.neural_net_output = learner.neural_net.update( [ paddle_offset_from_ball.x, paddle_offset_from_ball.y, ball_velocity.x, ball_velocity.y, paddle_offset_from_screen_origin.x, paddle_offset_from_screen_origin.y ] );
	
	debug_manager.add_or_update( "NN Input", paddle_offset_from_ball.x.toFixed( 3 ) + " " + paddle_offset_from_ball.y.toFixed( 3 ) + " " + ball_velocity.x.toFixed( 3 ) + " " + ball_velocity.y.toFixed( 3 ) + " " + paddle_offset_from_screen_origin.x.toFixed( 3 ) + " " + paddle_offset_from_screen_origin.y.toFixed( 3 ) );

	debug_manager.add_or_update( "NN Output", learner.neural_net_output );
	
	if ( use_neural_network_paddle )
	{	
	
		if ( learner.neural_net_output[ 0 ] < 0.0 )
		{
			
			// Output indicates that we must go down the screen
			// by some magnitude in the range (0,MAG_MAX].
			
			// Don't set a negative magnitude so multiply the output by -1 to
			// make it positive and multiply this result by the starting paddle
			// magnitude.
			
			paddle.set_magnitude( starting_paddle_magnitude * ( -1 * learner.neural_net_output[ 0 ] ) );
			
			paddle.set_angle( 270 );
			
		}
		else if ( learner.neural_net_output[ 0 ] == 0.0 )
		{
			
			// Don't move.
			
			paddle.set_magnitude( 0.0 );
			
			paddle.set_angle( starting_paddle_angle );
			
		}
		else if ( learner.neural_net_output[ 0 ] > 0.0 )
		{
			
			// Go up by some portion of the starting paddle magnitude.
			
			paddle.set_magnitude( starting_paddle_magnitude * learner.neural_net_output[ 0 ] );
			
			paddle.set_angle( 90.0 );
			
		}
		
	}	
	else if ( use_perfect_paddle )
	{
		
		/*
		
		var difference = paddle.dynamic_object.get_center( ).y - ball.dynamic_object.get_center( ).y;
		
		debug_manager.add_or_update( "Perfect Output", difference );
		
		if ( difference < 0 )
		{
			
			paddle.set_magnitude( 10.0 * ( -1 * difference ) );
			
			paddle.set_angle( 270 );
			
		}
		else if ( difference == 0.0 )
		{
			
			paddle.set_magnitude( 0.0 );
			
			paddle.set_angle( starting_paddle_angle );
			
		}			
		else if ( difference > 0 )
		{
			
			paddle.set_magnitude( 10.0 * difference );
			
			paddle.set_angle( 90.0 );
			
		}
		
		*/
		
		paddle.set_magnitude( 0.0 );
			
		paddle.set_angle( starting_paddle_angle );
		
		var ball_center   = ball.dynamic_object.get_center( );
		
		var paddle_center = paddle.dynamic_object.get_center( );
		
		paddle.dynamic_object.set_center( paddle_center.x, ball_center.y );
		
	}
	else if ( use_random_paddle )
	{
		
		var random_float = get_random_float( -1, 1 );
		
		debug_manager.add_or_update( "Random Output", random_float );
		
		if ( random_float < 0.0 )
		{
		     
			paddle.set_magnitude( starting_paddle_magnitude * ( -1 * random_float ) );
       	
			paddle.set_angle( 270.0 );			
		  
		}
		else if ( random_float == 0.0 )
		{
			
			paddle.set_magnitude( 0.0 );
       	
			paddle.set_angle( starting_paddle_angle );
			
		}
		else if ( random_float > 0.0 )
		{
		     
			paddle.set_magnitude( starting_paddle_magnitude * random_float );
       	
			paddle.set_angle( 90.0 );
       
		}
		
	}
	
}

// Experiment one fitness function.

function handle_genome_evaluation( )
{	
	
	pause = true;
	
	var fitness = 0.0;
	
	for( var i = 0; i < learner.current_genome_fitness_tracking.length - 1; ++i )
	{
		
		if ( learner.current_genome_fitness_tracking[ i ] < learner.current_genome_fitness_tracking[ i + 1 ] )
		{
		
			fitness = fitness - 0.1;
		
		}
		else if ( learner.current_genome_fitness_tracking[ i ] == learner.current_genome_fitness_tracking[ i + 1 ] )
		{
		
			if ( learner.current_genome_fitness_tracking[ i ] == 0 && learner.current_genome_fitness_tracking[ i + 1 ] == 0 )
			{
			
				fitness = fitness + 0.1;
				
			}
			else
			{
			
				fitness = fitness - 0.1;
				
			}
		
		}
		else if ( learner.current_genome_fitness_tracking[ i ] > learner.current_genome_fitness_tracking[ i + 1 ] )
		{
		
			fitness = fitness + 0.1;
		
		}
		
	}
	
	learner.current_genome_fitness_tracking = [ ];
	
	fitness = fitness + ( 1 * learner.current_genome_paddle_hits );
	
	learner.current_genome_paddle_hits = 0;
	
	if ( fitness < 0.0 ) fitness = 0.0;

	debug_manager.add_or_update( "Last Genome Fitness", fitness );

	learner.genetic_algorithm.set_genome_fitness( learner.current_genome_being_evalutated, fitness );
	
	if ( ( learner.current_genome_being_evalutated + 1 ) == learner.genetic_algorithm.get_population_size( ) )
	{

		// Evaluated all the genomes in the population.
		// Calculate population metrics.
		// Adjust crossover and mutation probabilities if using self-adaptation.		
		
		learner.genetic_algorithm.sort_population( );
		
		learner.genetic_algorithm.evaluate_population( );
		
		if ( learner.parameters.genetic_algorithm.useSelfAdaptation )
		{
			
			learner.genetic_algorithm.adjust_crossover_and_mutation_probabilities( );
			
		}
		
		// Package up this population and send it to the database if its generation number is higher than
		// the highest generation number already in the database.
		
		var data_string  = "generation_number="           + learner.genetic_algorithm.get_generation_number( );
		data_string     += "&best_fitness="               + learner.genetic_algorithm.get_best_fitness( );
		data_string     += "&average_fitness="            + learner.genetic_algorithm.get_average_fitness( );
		data_string     += "&worst_fitness="              + learner.genetic_algorithm.get_worst_fitness( );
		data_string     += "&population_size="            + learner.genetic_algorithm.get_population_size( );
		data_string     += "&number_of_genes_per_genome=" + learner.genetic_algorithm.get_number_of_genes_per_genome( );
		data_string     += "&crossover_probability="      + learner.genetic_algorithm.get_crossover_probability( );
		data_string     += "&mutation_probability="       + learner.genetic_algorithm.get_mutation_probability( );
		data_string     += "&population_genes="           + learner.genetic_algorithm.get_population_genes_flattened( );
		
		database_manager.send_and_receive( "assets/scripts/store_genomes.php", data_string, database_manager, "adding_genome_population" );
		
		if ( run_experiment )
		{	
		
			// Experiment of first 100 generations.

			if ( learner.genetic_algorithm.get_generation_number( ) < 100 )
			{
			
				var experiment_record_data_string  = "action=record";
				experiment_record_data_string     += "&generation_number="        + learner.genetic_algorithm.get_generation_number( );
				experiment_record_data_string     += "&best_fitness="             + learner.genetic_algorithm.get_best_fitness( );
				experiment_record_data_string     += "&average_fitness="          + learner.genetic_algorithm.get_average_fitness( );
				experiment_record_data_string     += "&worst_fitness="            + learner.genetic_algorithm.get_worst_fitness( );
				experiment_record_data_string     += "&crossover_probability="    + learner.genetic_algorithm.get_crossover_probability( );
				experiment_record_data_string     += "&mutation_probability="     + learner.genetic_algorithm.get_mutation_probability( );			
				
				database_manager.send_and_receive( "assets/scripts/experiment.php", experiment_record_data_string, database_manager, "experiment_record" );
				
				if ( ( learner.genetic_algorithm.get_generation_number( ) + 1 ) % 10 == 0 )
				{
				
					var experiment_store_data_string  = "action=store";
					experiment_store_data_string     += "&generation_number="        + learner.genetic_algorithm.get_generation_number( );
					experiment_store_data_string     += "&fitness="                  + learner.genetic_algorithm.get_genome_fitness( learner.genetic_algorithm.get_fittest_genome_index( ) ); 
					experiment_store_data_string     += "&crossover_probability="    + learner.genetic_algorithm.get_crossover_probability( ); 
					experiment_store_data_string     += "&mutation_probability="     + learner.genetic_algorithm.get_mutation_probability( ); 
					experiment_store_data_string     += "&genes="                    + learner.genetic_algorithm.get_genome_genes_flattened( learner.genetic_algorithm.get_fittest_genome_index( ) ); 
				
					database_manager.send_and_receive( "assets/scripts/experiment.php", experiment_store_data_string, database_manager, "experiment_store" );
					
				}
				
			}
			
		}
		
		// Generate a new generation.
		
		learner.genetic_algorithm.generate_new_generation( );

		// Get the makeup of the population.

		learner.genetic_algorithm.compute_population_makeup( );
		
		// Load in the first genome's genes.
		
		learner.current_genome_being_evalutated = 0;
		
		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
	}
	else
	{
		
		// Test the next genome in the population.
		
		learner.current_genome_being_evalutated += 1;
		
		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
	}	
	
	learner.evaluate_current_genome = false;
	
	reset( );
	
}

/* Commented out for the rerun of experiment one.

function handle_genome_evaluation( )
{	
	
	pause = true;
	
	var fitness = 0.0;
	
	for( var i = 0; i < learner.current_genome_fitness_tracking.length; ++i )
	{
		
		fitness += learner.current_genome_fitness_tracking[ i ];
		
	}
	
	learner.current_genome_fitness_tracking = [ ];
	
	if ( fitness < 0.0 ) fitness = 0.0;

	debug_manager.add_or_update( "Last Genome Fitness", fitness );

	learner.genetic_algorithm.set_genome_fitness( learner.current_genome_being_evalutated, fitness );
	
	if ( ( learner.current_genome_being_evalutated + 1 ) == learner.genetic_algorithm.get_population_size( ) )
	{

		// Evaluated all the genomes in the population.
		// Calculate population metrics.
		// Adjust crossover and mutation probabilities if using self-adaptation.		
		
		learner.genetic_algorithm.sort_population( );
		
		learner.genetic_algorithm.evaluate_population( );
		
		if ( learner.parameters.genetic_algorithm.useSelfAdaptation )
		{
			
			learner.genetic_algorithm.adjust_crossover_and_mutation_probabilities( );
			
		}
		
		// Package up this population and send it to the database if its generation number is higher than
		// the highest generation number already in the database.
		
		var data_string  = "generation_number="           + learner.genetic_algorithm.get_generation_number( );
		data_string     += "&best_fitness="               + learner.genetic_algorithm.get_best_fitness( );
		data_string     += "&average_fitness="            + learner.genetic_algorithm.get_average_fitness( );
		data_string     += "&worst_fitness="              + learner.genetic_algorithm.get_worst_fitness( );
		data_string     += "&population_size="            + learner.genetic_algorithm.get_population_size( );
		data_string     += "&number_of_genes_per_genome=" + learner.genetic_algorithm.get_number_of_genes_per_genome( );
		data_string     += "&crossover_probability="      + learner.genetic_algorithm.get_crossover_probability( );
		data_string     += "&mutation_probability="       + learner.genetic_algorithm.get_mutation_probability( );
		data_string     += "&population_genes="           + learner.genetic_algorithm.get_population_genes_flattened( );
		
		database_manager.send_and_receive( "assets/scripts/store_genomes.php", data_string, database_manager, "adding_genome_population" );
		
		if ( run_experiment )
		{	
		
			// Experiment of first 100 generations.

			if ( learner.genetic_algorithm.get_generation_number( ) < 100 )
			{
			
				var experiment_record_data_string  = "action=record";
				experiment_record_data_string     += "&generation_number="        + learner.genetic_algorithm.get_generation_number( );
				experiment_record_data_string     += "&best_fitness="             + learner.genetic_algorithm.get_best_fitness( );
				experiment_record_data_string     += "&average_fitness="          + learner.genetic_algorithm.get_average_fitness( );
				experiment_record_data_string     += "&worst_fitness="            + learner.genetic_algorithm.get_worst_fitness( );
				experiment_record_data_string     += "&crossover_probability="    + learner.genetic_algorithm.get_crossover_probability( );
				experiment_record_data_string     += "&mutation_probability="     + learner.genetic_algorithm.get_mutation_probability( );			
				
				database_manager.send_and_receive( "assets/scripts/experiment.php", experiment_record_data_string, database_manager, "experiment_record" );
				
				if ( ( learner.genetic_algorithm.get_generation_number( ) + 1 ) % 10 == 0 )
				{
				
					var experiment_store_data_string  = "action=store";
					experiment_store_data_string     += "&generation_number="        + learner.genetic_algorithm.get_generation_number( );
					experiment_store_data_string     += "&fitness="                  + learner.genetic_algorithm.get_genome_fitness( learner.genetic_algorithm.get_fittest_genome_index( ) ); 
					experiment_store_data_string     += "&crossover_probability="    + learner.genetic_algorithm.get_crossover_probability( ); 
					experiment_store_data_string     += "&mutation_probability="     + learner.genetic_algorithm.get_mutation_probability( ); 
					experiment_store_data_string     += "&genes="                    + learner.genetic_algorithm.get_genome_genes_flattened( learner.genetic_algorithm.get_fittest_genome_index( ) ); 
				
					database_manager.send_and_receive( "assets/scripts/experiment.php", experiment_store_data_string, database_manager, "experiment_store" );
					
				}
				
			}
			
		}
		
		// Generate a new generation.
		
		learner.genetic_algorithm.generate_new_generation( );

		// Get the makeup of the population.

		learner.genetic_algorithm.compute_population_makeup( );
		
		// Load in the first genome's genes.
		
		learner.current_genome_being_evalutated = 0;
		
		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
	}
	else
	{
		
		// Test the next genome in the population.
		
		learner.current_genome_being_evalutated += 1;
		
		learner.neural_net.put_weights( learner.genetic_algorithm.get_genome_genes( learner.current_genome_being_evalutated ) );
		
	}	
	
	learner.evaluate_current_genome = false;
	
	reset( );
	
}

*/

var ball_magnitude_reduction_threshold = 100;
var ball_magnitude_reduce_by_percentage = .5;

function collision_handler( colliding_objects )
{
	
	learner.evaluate_current_genome = false;
	
	for ( var i = 0; i < colliding_objects.length; ++i )
	{
		
		// Ball collisions
		
		if ( colliding_objects[ i ][ 0 ].id == "ball" && colliding_objects[ i ][ 1 ].id == "paddle" || ( colliding_objects[ i ][ 0 ].id == "paddle" && colliding_objects[ i ][ 1 ].id == "ball" ) )
		{

			ball.set_magnitude( ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * ball_magnitude_reduce_by_percentage ) ) > ball_magnitude_reduction_threshold ? ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * .1 ) ) : 0 ); 
			
			learner.current_genome_paddle_hits = learner.current_genome_paddle_hits + 1;
			
			if ( ball.get_magnitude( ) == 0 )
			{
				
				learner.evaluate_current_genome = true;
				
			}
			
			// Wind the ball's position back, going along the direction opposite of the angle it was traveling along when it collided with 
			// the paddle until it no longer collides with the paddle.
			// This is easier to calculate than finding the intersection of a line along the direction of the ball's vector with that of
			// the paddle's top, right, bottom, and left boundary lines.

			var reverse_angle = ball.mod_degrees( ( ball.get_angle( ) + 180 ) );			
			var dx =  5 * Math.cos( ball.degrees_to_radians( reverse_angle ) );			
			var dy = -5 * Math.sin( ball.degrees_to_radians( reverse_angle ) ); // Negative one because of the mirrored coordinate system. 			
			while ( physics_engine.rectangle_intersection( paddle.dynamic_object, ball.dynamic_object ) )
			{
				
				ball.dynamic_object.move_center( dx, dy );
				
			}
			
			// There are two cases:
			// 	1. The ball hits the paddle from the top or bottom.
			//	2. The ball hits the paddle from either the left or right.
			
			if ( ( ball.dynamic_object.get_top( ) > paddle.dynamic_object.get_bottom( ) ) || ( ball.dynamic_object.get_bottom( ) < paddle.dynamic_object.get_top( ) ) )
			{
				
				// Top or bottom side case.
				
				// Physics_Object.set_angle expects an angle as if y+ was going UP the screen.
				// So say the ball hits the top wall at 35 degrees. The angle of incidence would be 35 degrees and so the ball should be reflected back
				// at -35 degrees or -35 % 360 = 325  which we set.
				// -1 * 35 = -35 mod 360 = 325
				// |_||_||_||_||_||_||_||_||_||_||_||_||_||_||_||_|
				//                       .
				//                         )
				// .   )                                       .
				// ---------------------------------------------
				
				var reflection_angle = ball.mod_degrees( -1 * ball.get_angle( ) );			
				ball.set_angle( reflection_angle );
				
			}
			else
			{
			
				// Left or right side case.
				
				// Physics_Object.set_angle expects an angle as if y+ was going UP the screen.
				// So say the ball hits the paddle at 170 degrees. The angle of incidence would be 10 degrees and so the ball should be reflected back
				// at 10 degrees which we set.
				// -1 * ( 170 - 180 ) = 10
				// |/|
				// |/|
				// |/|
				// |/|                 .
				// |/|.________________)___
				// |/|                (.
				// |/|
				// |/|
				
				
				var reflection_angle = -1 * ( ball.get_angle( ) - 180.0);
				ball.set_angle( reflection_angle );
				
			}
			
		}		
		else if ( colliding_objects[ i ][ 0 ].id == "ball" && colliding_objects[ i ][ 1 ].id == "top_wall" || ( colliding_objects[ i ][ 0 ].id == "top_wall" && colliding_objects[ i ][ 1 ].id == "ball" ) )
		{
			
			ball.set_magnitude( ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * ball_magnitude_reduce_by_percentage ) ) > ball_magnitude_reduction_threshold ? ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * .1 ) ) : 0 ); 
			
			if ( ball.get_magnitude( ) == 0 )
			{
				
				learner.evaluate_current_genome = true;
				
			}
			
			
			ball.dynamic_object.move_center( 0, ( -1 * ball.dynamic_object.get_top( ) ) + 1 );
			
			// Physics_Object.set_angle expects an angle as if y+ was going UP the screen.
			// So say the ball hits the top wall at 35 degrees. The angle of incidence would be 35 degrees and so the ball should be reflected back
			// at -35 degrees or -35 % 360 = 325  which we set.
			// -1 * 35 = -35 mod 360 = 325
			// |_||_||_||_||_||_||_||_||_||_||_||_||_||_||_||_|
			//                       .
			//                         )
			// .   )                                       .
			// ---------------------------------------------
		
			
			var reflection_angle = ball.mod_degrees( -1 * ball.get_angle( ) );			
			ball.set_angle( reflection_angle );
			
		}
		else if ( colliding_objects[ i ][ 0 ].id == "ball" && colliding_objects[ i ][ 1 ].id == "right_wall" || ( colliding_objects[ i ][ 0 ].id == "right_wall" && colliding_objects[ i ][ 1 ].id == "ball" ) )
		{
			
			ball.set_magnitude( ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * ball_magnitude_reduce_by_percentage ) ) > ball_magnitude_reduction_threshold ? ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * .1 ) ) : 0 ); 
			
			if ( ball.get_magnitude( ) == 0 )
			{
				
				learner.evaluate_current_genome = true;
				
			}			
			
			ball.dynamic_object.move_center( ( -1 * ( ball.dynamic_object.get_right( ) - window.innerWidth ) ) -1, 0 ); 
			
			var reflection_angle = -1 * ( ball.get_angle( ) - 180.0);
			ball.set_angle( reflection_angle );
			
		}
		else if ( colliding_objects[ i ][ 0 ].id == "ball" && colliding_objects[ i ][ 1 ].id == "bottom_wall" || ( colliding_objects[ i ][ 0 ].id == "bottom_wall" && colliding_objects[ i ][ 1 ].id == "ball" ) )
		{
			
			ball.set_magnitude( ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * ball_magnitude_reduce_by_percentage) ) > ball_magnitude_reduction_threshold ? ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * .1 ) ) : 0 ); 
			
			if ( ball.get_magnitude( ) == 0 )
			{
				
				learner.evaluate_current_genome = true;
				
			}			
			
			ball.dynamic_object.move_center( 0, ( -1 * ( ball.dynamic_object.get_bottom( ) - window.innerHeight ) ) -1 );
			
			var reflection_angle = ball.mod_degrees( -1 * ball.get_angle( ) );			
			ball.set_angle( reflection_angle );
			
		}
		else if ( colliding_objects[ i ][ 0 ].id == "ball" && colliding_objects[ i ][ 1 ].id == "left_wall" || ( colliding_objects[ i ][ 0 ].id == "left_wall" && colliding_objects[ i ][ 1 ].id == "ball" ) )
		{
			
			ball.set_magnitude( ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * ball_magnitude_reduce_by_percentage ) ) > ball_magnitude_reduction_threshold ? ( ball.get_magnitude( ) - ( ball.get_magnitude( ) * .1 ) ) : 0 ); 
			
			learner.evaluate_current_genome = true;
			
			ball.dynamic_object.move_center( ( -1 * ( ball.dynamic_object.get_left( ) ) ) + 1, 0 ); 
			
			var reflection_angle = -1 * ( ball.get_angle( ) - 180.0);
			ball.set_angle( reflection_angle );
			
		}
		
		// Paddle collisions.
		
		if ( colliding_objects[ i ][ 0 ].id == "paddle" && colliding_objects[ i ][ 1 ].id == "top_wall" || ( colliding_objects[ i ][ 0 ].id == "top_wall" && colliding_objects[ i ][ 1 ].id == "paddle" ) )
		{
			
			paddle.dynamic_object.move_center( 0, ( -1 * paddle.dynamic_object.get_top( ) ) + 1 );
			
		}
		else if ( colliding_objects[ i ][ 0 ].id == "paddle" && colliding_objects[ i ][ 1 ].id == "bottom_wall" || ( colliding_objects[ i ][ 0 ].id == "bottom_wall" && colliding_objects[ i ][ 1 ].id == "paddle" ) )
		{
			
			paddle.dynamic_object.move_center( 0, ( -1 * ( paddle.dynamic_object.get_bottom( ) - window.innerHeight ) ) -1 );
			
		}			
		
	}
	
}


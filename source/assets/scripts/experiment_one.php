<?php

	/*
	* 
	* David Lettier (C) 2013.
	* 
	* http://www.lettier.com/
	* 
	*/
	
	require( '' );
	
	$link = mysql_connect( "localhost", $c, $d ) or die( mysql_error( ) );
	
	$action = mysql_real_escape_string( $_POST[ 'action' ] );
	
	$generation = intval( mysql_real_escape_string( $_POST[ 'generation' ] ) );
	
	$average_fitness = 0;
	
	$fitness = 0;
	
	$parameters = 0;	
	
	$result = 0;
	
	if ( $action === "record" )
	{
	
		$average_fitness = floatval( mysql_real_escape_string( $_POST[ 'average_fitness' ] ) );
		
		$result = mysql_query( "INSERT INTO `lettier0`.`exp1_avgs` ( `id`, `generation`, `average_fitness` ) VALUES ( NULL, $generation, $average_fitness );" ); 
			
		if ( $result )
		{
			
			echo "[Experiment_One] Recorded average successfully.";
			
		}
		else
		{
			
			echo mysql_error( $link );
			
		}	
	
	}
	else if ( $action === "store" )
	{

		$fitness = floatval( mysql_real_escape_string( $_POST[ 'fitness' ] ) );
		
		$parameters = mysql_real_escape_string( $_POST[ 'parameters' ] );
		
		$result = mysql_query( "INSERT INTO `lettier0`.`exp1_tops` ( `id`, `generation`, `fitness`, `parameters` ) VALUES ( NULL, $generation, $fitness, '$parameters' );" ); 
			
		if ( $result )
		{
			
			echo "[Experiment_One] Stored top performer parameters successfully.";
			
		}
		else
		{
			
			echo mysql_error( $link );
			
		}
	
	}
	else
	{
	
		echo "[Experiment_One] Action not recognized.";
		
	}

?>
<?php

	/*
	* 
	* David Lettier (C) 2013.
	* 
	* http://www.lettier.com/
	* 
	*/
	
	require( '/virtual/users/e14157-14235/storage/vars.php' );
	
	$link   = mysql_connect( "localhost", $a, $b ) or die( mysql_error( ) );
	
	$action            = mysql_real_escape_string( $_POST[ 'action' ] );
	
	$generation_number = intval( mysql_real_escape_string( $_POST[ 'generation_number' ] ) );	
	
	$crossover_rate    = floatval( mysql_real_escape_string( $_POST[ 'crossover_rate' ] ) );
	
	$mutation_rate     = floatval( mysql_real_escape_string( $_POST[ 'mutation_rate' ] ) );
	
	$average_fitness = 0;
	
	$fitness         = 0;
	
	$genes           = 0;	
	
	$result          = 0;
	
	if ( $action === "record" )
	{
	
		$average_fitness = floatval( mysql_real_escape_string( $_POST[ 'average_fitness' ] ) );
		
		$result = mysql_query( "INSERT INTO `lettier0`.`SIMPL_EXP_AVGS` ( `id`, `generation_number`, `average_fitness`, `crossover_rate`, `mutation_rate` ) VALUES ( NULL, $generation_number, $average_fitness, $crossover_rate, $mutation_rate );" ); 
			
		if ( $result )
		{
			
			echo "[Experiment] Recorded successfully.";
			
		}
		else
		{
			
			echo mysql_error( $link );
			
		}	
	
	}
	else if ( $action === "store" )
	{

		$fitness = floatval( mysql_real_escape_string( $_POST[ 'fitness' ] ) );
		
		$genes = mysql_real_escape_string( $_POST[ 'genes' ] );
		
		$result = mysql_query( "INSERT INTO `lettier0`.`SIMPL_EXP_10TH_TOPS` ( `id`, `generation_number`, `fitness`, `crossover_rate`, `mutation_rate`, `genes` ) VALUES ( NULL, $generation_number, $fitness, $crossover_rate, $mutation_rate, '$genes' );" ); 
			
		if ( $result )
		{
			
			echo "[Experiment] Stored successfully.";
			
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
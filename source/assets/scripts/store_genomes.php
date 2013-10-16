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
	
	$generation = intval( mysql_real_escape_string( $_POST[ 'generation' ] ) );
	
	$average_fitness = floatval( mysql_real_escape_string( $_POST[ 'average_fitness' ] ) );
	
	$population_size = intval( mysql_real_escape_string( $_POST[ 'population_size' ] ) );
	
	$number_of_parameters = intval( mysql_real_escape_string( $_POST[ 'number_of_parameters' ] ) ); 
	
	$parameters = mysql_real_escape_string( $_POST[ 'parameters' ] ); 	
	
	mysql_select_db( "lettier0" ) or die( mysql_error( ) );
	
	$row_sql = mysql_query( "SELECT MAX( `generation` ) AS max FROM `simpl_genomes` WHERE `population_size` = $population_size AND `number_of_parameters` = $number_of_parameters;" );
	$row = mysql_fetch_array( $row_sql );
	$biggest_generation = intval( $row[ 'max' ] );
	
	$result = null;
	
	if ( !is_null( $biggest_generation ) OR !empty( $biggest_generation ) OR $biggest_generation != 0  )
	{
	
		if ( $generation > $biggest_generation )
		{
			
			$result = mysql_query( "INSERT INTO `lettier0`.`simpl_genomes` ( `id`, `entry_date`, `generation`, `average_fitness`, `population_size`, `number_of_parameters`, `parameters` ) VALUES ( NULL, CURRENT_TIMESTAMP, $generation, $average_fitness, $population_size, $number_of_parameters, '$parameters' );" ); 
			
			if ( $result )
			{
				
				echo "[Store_Genomes] Added genome generation successfully.";
				
			}
			else
			{
				
				echo mysql_error( $link );
				
			}
		}
		else
		{
		
			echo "[Store_Genomes] Need generation higher than $biggest_generation.";
			
		}
	}
	else
	{
	
		$result = mysql_query( "INSERT INTO `lettier0`.`simpl_genomes` ( `id`, `entry_date`, `generation`, `average_fitness`, `population_size`, `number_of_parameters`, `parameters` ) VALUES ( NULL, CURRENT_TIMESTAMP, $generation, $average_fitness, $population_size, $number_of_parameters, '$parameters' );" ); 
			
		if ( $result )
		{
			
			echo "[Store_Genomes] Added genome generation successfully.";
			
		}
		else
		{
			
			echo mysql_error( $link );
			
		}
	
	}

?>
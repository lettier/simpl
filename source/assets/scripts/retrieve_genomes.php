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
	
	$population_size = intval( mysql_real_escape_string( $_POST[ 'population_size' ] ) );
	
	$number_of_parameters = intval( mysql_real_escape_string( $_POST[ 'number_of_parameters' ] ) ); 
	
	mysql_select_db( "lettier0" ) or die( mysql_error( ) );
	
	$row_sql = mysql_query( "SELECT `generation`, `parameters`  FROM `simpl_genomes` WHERE `population_size` = $population_size AND `number_of_parameters` = $number_of_parameters ORDER BY `generation` DESC LIMIT 1" );
	$row = mysql_fetch_array( $row_sql );
	echo $row[ 'generation' ] . ";" . $row[ 'parameters' ];

?>
/*
 * 
 * David Lettier (C) 2013.
 * 
 * http://www.lettier.com/
 * 
 */

function Static_Object( id )
{

	this.id = id;
	
	this.object = document.getElementById( this.id );
	
	this.top = this.object.offsetTop;	
	
	this.left = this.object.offsetLeft;
	
	this.height = this.object.offsetHeight || this.object.clientHeight;
	
	this.width = this.object.offsetWidth || this.object.clientWidth;
	
	this.right = this.left + this.width;
	
	this.bottom = this.top + this.height;	
	
	this.center = { x: this.left + ( this.width / 2 ), y: this.top + ( this.height / 2 ) };	
	
	this.get_object = function ( )
	{
		
		return document.getElementById( this.id );
		
	}
	
	this.get_top = function ( )
	{
		
		this.top = this.object.offsetTop;
		
		return this.top;
		
	}
	
	this.get_left = function ( )
	{
		
		this.left = this.object.offsetLeft;
		
		return this.left;
		
	}
	
	this.get_height = function ( )
	{

		this.height = this.object.offsetHeight || this.object.clientHeight;
		
		return this.height;		
		
	}
	
	this.get_width = function ( )
	{

		this.width = this.object.offsetWidth || this.object.clientWidth;
		
		return this.width;		
		
	}	
	
	this.get_right = function ( )
	{

		this.right = this.get_left( ) + this.get_width( );
		
		return this.right;
		
	}
	
	this.get_bottom = function ( )
	{
		
		this.bottom = this.get_top( ) + this.get_height( );
		
		return this.bottom;
		
	}	
	
	this.get_center = function ( )
	{
		
		this.center.x = this.get_left( ) + ( this.get_width( ) / 2 );
		
		this.center.y = this.get_top( ) + ( this.get_height( ) / 2 );
		
		return this.center;
		
	}
	
	this.get_distance_to = function ( object )
	{
		
		if ( object == undefined ) { console.log( "[Dynamic_Object:distance_to] Object not set." ); return { x: 0, y: 0, h: 0 }; }
		
		if ( !object.hasOwnProperty( "get_center" ) ) { console.log( "[Dynamic_Object:distance_to] Object does not have get_center." ); return { x: 0, y: 0, h: 0 }; } 
		
		var math_abs = Math.abs;
		
		var x = math_abs( this.get_center( ).x - object.get_center( ).x );
		
		var y = math_abs( this.get_center( ).y - object.get_center( ).y );
		
		var h = Math.sqrt( ( x * x ) + ( y * y ) );
		
		return { x: x, y: y, h: h };
		
	}
	
}
/*
 * 
 * David Lettier (C) 2013.
 * 
 * http://www.lettier.com/
 * 
 */

function Physics_Engine( collision_callback )
{
	
	if ( collision_callback == undefined ) { console.error( "[Physics_Engine] No collision callback set." ); return null; }
	
	this.args = Array.prototype.slice.call( arguments );
	
	if ( this.args.length == 1 ) { console.error( "[Physics_Engine] No physics and/or static objects passed." ); return null; }

	this.static_objects = new Array( );
	
	this.physics_objects = new Array( );
	
	this.colliding_objects = new Array( );
	
	for ( var i = 1; i < this.args.length; ++i )
	{
		
		if ( this.args[ i ].hasOwnProperty( "velocity" ) )
		{
			
			this.physics_objects.push( this.args[ i ] );
			
		}
		else if ( this.args[ i ].hasOwnProperty( "get_left" ) ) 
		{
			
			this.static_objects.push( this.args[ i ] );
			
		}
		
	}
	
	this.rectangle_intersection = function ( r1, r2 )
	{

		if ( r1 == undefined && r2 == undefined ) { console.error( "[Physics_Engine] Rectangles are not set." ); return null; }

		if ( r1.hasOwnProperty( "get_left" ) && r2.hasOwnProperty( "get_left" )  )
		{
		
			return !( r2.get_left( ) > r1.get_right( ) || r2.get_right( ) < r1.get_left( ) || r2.get_top( ) > r1.get_bottom( ) || r2.get_bottom( ) < r1.get_top( ) );
			
		}
		else
		{
		
			console.error( "[Physics_Engine] Rectangle objects have no property get_left." );
			
		}
		
	}

	this.update = function ( time_delta )
	{
		
		this.colliding_objects = [ ];
		
		var colliding = false;
		
		var call_collision_callback = false;
		
		// Test for collisions between physics objects.
		
		if ( this.physics_objects.length > 1 )
		{
		
			for ( var i = 0; i < this.physics_objects.length; ++i )
			{
				
				for ( var j = i + 1; j < this.physics_objects.length; ++j )
				{
					
					if ( this.rectangle_intersection( this.physics_objects[ i ].dynamic_object, this.physics_objects[ j ].dynamic_object ) )
					{
					
						this.colliding_objects.push( [ this.physics_objects[ i ], this.physics_objects[ j ] ] ); 
						
						call_collision_callback = true;
											    
					}
					
				}
				
			}
			
		}
		
		// Test for collisions between physics objects and static objects.
		
		if ( this.physics_objects.length > 0 && this.static_objects.length > 0 )
		{
			
			for ( var i = 0; i < this.physics_objects.length; ++i )
			{
				
				for ( var j = 0; j < this.static_objects.length; ++j )
				{
				
					if ( this.rectangle_intersection( this.physics_objects[ i ].dynamic_object, this.static_objects[ j ] ) )
					{
					
						this.colliding_objects.push( [ this.physics_objects[ i ], this.static_objects[ j ] ] );
						
						call_collision_callback = true;
											    
					}
					
				}
				
			}
			
		}
		
		if ( ( this.physics_objects.length < 2 && this.physics_objects.length > 0 ) && this.static_objects.length == 0 )
		{
			
			this.physics_objects[ 0 ].update( time_delta );
			
		}
		else if ( this.physics_objects.length > 0 && this.static_objects.length > 0 )
		{
			
			if ( this.colliding_objects.length > 0 )
			{
				
				for ( var i = 0; i < this.physics_objects.length; ++i )
				{
					
					colliding = false;
					
					for ( var j = 0; j < this.colliding_objects.length; ++j )
					{
					
						for ( var k = 0; k < this.colliding_objects[ j ].length; ++k )
						{
						
							if ( this.physics_objects[ i ].id == this.colliding_objects[ j ][ k ].id  )
							{
						
								colliding = true;								
								
								break;
												
							}							
							
						}
						
						if ( colliding ) break;
						
					}
					
					if ( !colliding )
					{
						
						this.physics_objects[ i ].update( time_delta );
						
					}
					
				}
				
			}
			else
			{
				
				for ( var i = 0; i < this.physics_objects.length; ++i )
				{
					
					this.physics_objects[ i ].update( time_delta );
					
				}
				
			}
			
		}
		
		if ( call_collision_callback ) collision_callback( this.colliding_objects );
		
	}

}
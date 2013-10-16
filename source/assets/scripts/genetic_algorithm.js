/*
 * 
 * David Lettier (C) 2013.
 * 
 * http://www.lettier.com/
 * 
 * Code ported and modified to JS from original C++ source ( http://www.ai-junkie.com/ann/evolved/nnt1.html ) as written by Mat Buckland.
 * 
 * Implements a genetic algorithm for learning.
 * 
 */

function Genome( weights, fitness )
{

	this.weights = null;
	this.fitness = null;
	
	if ( weights == undefined ) this.weights = new Array( );
	else this.weights = weights;

	if ( fitness == undefined ) this.fitness = 0.0;
	else this.fitness = fitness;

}

function Genetic_Algorithm( popSize, nWeights, rank, cRate, mRate, maxPerturbation, nElite, nEliteCopies )
{

	// Size of population.
	
	this.population_size_setting = popSize;

	// Amount of weights per chromosome.
	
	this.chromosome_length = nWeights;	

	// Use rank in selection?
	
	this.use_ranking_in_selection_setting = rank;
	
	// Probability of chromosomes crossing over bits.
	// 0.7 is pretty good.
	
	this.crossover_rate_setting = cRate;	
	this.actual_crossover_rate  = 0.0;	
	this.number_of_crossovers   = 0;
	this.crossover_attempts     = 0;
	
	// Probability that a chromosomes bits will mutate.
	// Try figures around 0.05 to 0.3-ish.
	
	this.mutation_rate_setting = mRate;	
	this.actual_mutation_rate  = 0.0;
	this.number_of_mutations   = 0;
	this.mutation_attempts     = 0;

	// Set max perturbation.
	
	this.max_perturbation_setting = maxPerturbation;
	
	// Set the elite parameters.
	
	this.number_of_elite_setting        = nElite;	
	this.number_of_elite_copies_setting = nEliteCopies;	
	
	// This holds the entire population of chromosomes.
	
	this.population = new Array( );

	// Total fitness of population.
	
	this.total_fitness = 0;	

	// Average fitness.
	
	this.average_fitness = 0;
	
	// Best fitness this population.
	
	this.best_fitness = 0;

	// Worst fitness.
	
	this.worst_fitness = 0;

	// Keeps track of the best genome.
	
	this.fittest_genome = -1;	

	// Generation counter.
	
	this.generation_counter = 0;
	
	// Initialize population with chromosomes consisting of random
	// weights and all fitness's set to zero.
	
	for ( var i = 0; i < this.population_size_setting; ++i )
	{
		
		this.population.push( new Genome( ) );

		for ( var j = 0; j < this.chromosome_length; ++j )
		{
			
			this.population[ i ].weights.push( get_random_float( -1.0, 1.0 ) );
			
		}
		
	}
	
	this.replace_population_parameters = function ( replacement_population_parameters )
	{
		
		if ( replacement_population_parameters == undefined || replacement_population_parameters.length == 0 || replacement_population_parameters.length != ( this.population_size_setting * this.chromosome_length ) )
		{
			
			console.error( "[Genetic_Algorithm:replace_population_parameters] Replacement population parameters invalid."   );
			
			return null;
			
		}
		
		var k = 0;
		
		// [ 1,1,1,1,1,1,1,1,1,1 ] >>
		// [ [ 1, 1 ]
		//   [ 1, 1 ]
		//   [ 1, 1 ]
		//   [ 1, 1 ]
		//   [ 1, 1 ]
		// ]
		
		for ( var i = 0; i < this.population_size_setting; ++i )
		{

			this.population[ i ].weights = [ ];
			
			for ( var j = 0; j < this.chromosome_length; ++j )
			{
				
				this.population[ i ].weights.push( replacement_population_parameters[ k ] );
				
				k += 1;

			}
			
		}
		
		return deep_copy( this.population );
		
	}

	this.crossover = function ( mum, dad, baby1, baby2 )
	{
		
		// Just return parents as offspring dependent on the rate or if parents are the same.
		
		// Changing this up a bit to cover JS's pass by reference copy. 
		// Here we have to change the internals of the objects passed (mum, dad, baby1, etc.) in order
		// to effect the objects passed outside of this function.
		
		// Epoch will have to pass gnomes instead of just arrays of weights.
		
		this.crossover_attempts += 1;
		
		if ( ( get_random_float( 0.0, 1.0 ) > this.crossover_rate_setting ) || ( mum.weights.toString( ) == dad.weights.toString( ) ) ) 
		{
			
			baby1.weights = [ ];
			baby2.weights = [ ];
			
			baby1.weights = deep_copy( mum.weights );
			baby1.fitness = 0;
			baby2.weights = deep_copy( dad.weights );
			baby2.fitness = 0;

			return null;
			
		}

		// Determine a crossover point.
		
		var cp = get_random_integer( 0, ( this.chromosome_length - 1 ) );

		// Create the offspring.
		
		baby1.weights = [ ];
		baby2.weights = [ ];
		
		for ( var i = 0; i < cp; ++i )
		{
			
			baby1.weights.push( mum.weights[ i ] );
			baby2.weights.push( dad.weights[ i ] );
			
		}

		for ( var i = cp; i < this.chromosome_length; ++i )
		{
			
			baby1.weights.push( dad.weights[ i ] );
			baby2.weights.push( mum.weights[ i ] );
			
		}
		
		this.number_of_crossovers += 1;

		return null;
		
	}

	this.mutate = function ( chromosome )
	{

		// Reference: http://www.nashcoding.com/2010/07/07/evolutionary-algorithms-the-little-things-youd-never-guess-part-1/#fn-28-1
		
		function gaussian_distribution( mean, standard_deviation )
		{
			
			// Two uniformally distributed random variable samplings.
			
			var x1 = Math.random( );
			var x2 = Math.random( );

			// The method requires sampling from a uniform random of (0,1]
			// but Math.random( ) returns a sample of [0,1).
			
			if ( x1 == 0 ) x1 = 1;
			if ( x2 == 0 )	x2 = 1;
			
			// Box-Muller transformation for Z_0.

			var y1 = Math.sqrt( -2.0 * Math.log( x1 ) ) * Math.cos( 2.0 * Math.PI * x2 );
			
			return ( y1 * standard_deviation ) + mean;
			
		}
		
		// Traverse the chromosome and mutate each weight dependent on the mutation rate.
		
		for ( var i = 0; i < chromosome.length; ++i )
		{
			// Do we perturb this gene?
			
			this.mutation_attempts += 1;
			
			if ( get_random_float( 0.0, 1.0 ) <= this.mutation_rate_setting )
			{
				
				// Mutate this gene by sampling a value from a normal distribution
				// where the mean is the current value and the standard deviation is based
				// on the weight range (taken from http://statistics.about.com):
				// "The range rule tells us that the standard deviation of 
				// a sample is approximately equal to one fourth of the range 
				// of the data. In other words s = ( Maximum – Minimum)/4."
				// So the valid range for a weight is [-1,1], thus the 
				// standard deviation is (1-(-1))/4=.5
				
				chromosome[ i ] = gaussian_distribution( chromosome[ i ], 0.5 );
				chromosome[ i ] = get_clamped_value( chromosome[ i ], -1.0, 1.0 ); 
				
				/* Old way.
				 
				// Add or subtract a small value to the weight.
				
				chromosome[ i ] += ( get_random_float( -1.0, 1.0 ) * this.max_perturbation_setting );
				
				chromosome[ i ] = get_clamped_value( chromosome[ i ], -1.0, 1.0 );
				
				*/
				
				this.number_of_mutations += 1;
				
			}
		}
		
		return chromosome;
		
	}

	this.get_chromosome_via_roulette = function ( rank )
	{
		
		if ( !rank )
		{
		
			// Say we have a population of 4 with these fitness values:
			// G-1: 1
			// G-2: 2
			// G-3: 3
			// G-4: 4
			// Total fitness: 10
			// Probabilities:
			// G-1: .1
			// G-2: .2
			// G-3: .3
			// G-4: .4
			//
			// Now shift them over by the running sum.
			// This give them a portion on the number line [0.0,1.0] proportional to their
			// fitness.
			//
			// G-1: .1
			// G-2: G-1 + .2 = .3
			// G-3: G-2 + .3 = .6
			// G-4: G-3 + .4 = 1.0
			//
			// 0.0----.10----.20----.30----.40----.50----.60----.70----.80----.90----1.0
			//        G-1           G-2                  G-3                         G-4
			//
			// Now selected a random float in [0.0,1.0]:
			// RF: .51
			//
			// 0.0----.10----.20----.30----.40----.50----.60----.70----.80----.90----1.0
			//        G-1           G-2              RF  G-3                         G-4
			//
			// G-3 gets selected for mating.

			var probabilities = new Array( );
			
			var parents = new Array( );
			
			if ( this.total_fitness == 0 )
			{
				
				// So that we don't divide by zero.
				// This means genomes all have zero fitness 
				// so just select two random parents.
				
				parents.push( get_random_integer( 0, this.population_size_setting - 1 ) );
				
				parents.push( get_random_integer( 0, this.population_size_setting - 1 ) );
				
				return parents;
				
			}

			probabilities.push( this.population[ 0 ].fitness / this.total_fitness );		
			
			for ( var i = 1; i < this.population_size_setting; ++i )
			{
				
				probabilities.push( probabilities[ i - 1 ] + ( this.population[ i ].fitness / this.total_fitness ) );
				
			}
			
			while( parents.length < 2 )
			{
				
				var random_number = get_random_float( 0.0, 1.0 );
				
				for ( var i = 0; i < this.population_size_setting; ++i )
				{
					
					if ( random_number <= probabilities[ i ] )
					{
						
						parents.push( i );
						
					}
					
				}
				
			}
			
			return parents;
			
		}
		else
		{
			
			// Assumes population is in ascending order by fitness.
			// This won't catch every case but some.
			
			if ( this.population[ this.population_size_setting - 1 ].fitness < this.population[ 0 ].fitness ) return null;
			
			// Give the worst genome a rank fitness of 1.
			// Give the second worst genome a rank fitness of 2.
			// ...
			// Give the best genome a rank fitness of the population size.
			
			// Now, based on rank fitness, do a roulette selection where the
			// probabilities are based on the rank fitness.
			
			var probabilities = new Array( );
			
			var parents = new Array( );
			
			// Rank fitness of the first is 1.
			// Probability is 1/(n(n+1)/2).
			// Where n is population size.
			// (n(n+1)/2) = the total rank fitness.
			// Summing the numbers from 1 to population size.
			// Say population size is 10.
			// Rank fitness: G-1 = 1, G-2 = 2, ..., G-10 = 10.
			// Total rank fitness is 1+2+3+...+10 = n(n+1)/2 = (10*11)/2 = 55
			// Probabilities:
			// G-1: 1/55
			// G-2: G-1 + 2/55
			// ...
			// G-10: G-9 + 10/55
			
			var total_rank_fitness = ( this.population_size_setting * ( this.population_size_setting + 1 ) ) / 2;

			probabilities.push( 1 / total_rank_fitness ); // First rank fitness probability.
			
			// Rest of the rank fitness probabilities.
			
			for ( var i = 1; i < this.population_size_setting; ++i )
			{
				
				probabilities.push( probabilities[ i - 1 ] + ( ( i + 1 ) / total_rank_fitness ) );
				
			}
			
			while( parents.length < 2 )
			{
				
				var random_number = get_random_float( 0.0, 1.0 );
				
				for ( var i = 0; i < this.population_size_setting; ++i )
				{
					
					if ( random_number <= probabilities[ i ] )
					{
						
						parents.push( i );
						
					}
					
				}
				
			}
			
			return parents;
			
		}
		
		/*
		 
		Old method.		
		
		// Generate a random number between 0 & total fitness count.
		
		var slice = get_random_float( 0.0, 1.0 ) * this.total_fitness;

		// This will be set to the chosen chromosome.
		
		var the_chosen_one = null;

		// Go through the chromosomes adding up the fitness so far.
		
		var fitness_so_far = 0;

		for ( var i = 0; i < this.population_size_setting; ++i )
		{
			fitness_so_far += this.population[ i ].fitness;

			// If the fitness so far >= the slice, return the chromosome at this point.
			
			if ( fitness_so_far >= slice )
			{
				
				the_chosen_one = this.population[ i ];

				break;
				
			}

		}

		return the_chosen_one;
		
		*/
		
	}

	this.grab_n_best = function ( nBest, nCopies, population ) 
	{

		if ( nBest > this.population_size_setting ) nBest = this.population_size_setting;
		
		if ( ( nBest * nCopies ) > this.population_size_setting ) nCopies = Math.floor( this.population_size_setting / nBest );
		
		// Assumes this.population is sorted in ascending order where g_0.f_0 < g_1.f_1 < g_n.fn.
		// Thus, the while loops pulls the fittest nBest from this.population from
		// nBest up to n-1 in this.population[].
		// [ g_0, g_1, g_2, g_3, ..., g_nBest, g_nBest+1, g_nBest+2, ..., g_n-1 ]
		// It copies the nBest_i by nCopies so say this.population looks like
		// [ 0, 1, 2, 3, 4 ], nBest is 3, and nCopies is 2 then population looks like
		// [ 2, 3, 4 ].
		// Or say this.population is [ 0, 1, 2, 3, 4, 5 ], nBest is 2, and nCopies is 2
		// then population looks like [ 4, 4, 5, 5 ].
		
		// Add the required amount of copies of the n most fittest to the supplied vector.
		
		while( nBest-- )
		{
			
			for ( var i = 0; i < nCopies; ++i )
			{
				
				population.push( deep_copy( this.population[ ( this.population_size_setting - 1 ) - nBest ] ) );
				
				if ( population.length == this.population_size_setting ) return;
				
			}
			
		}
		
	}

	this.calculate_best_worst_average_total_fitness = function ( )
	{

		this.reset( );

		var highest_so_far = this.population[ 0 ].fitness;
		var lowest_so_far  = this.population[ 0 ].fitness;
		
		this.fittest_genome = 0;		
		this.total_fitness  = this.population[ 0 ].fitness;		
		this.best_fitness   = this.population[ 0 ].fitness;
		this.worst_fitness  = this.population[ 0 ].fitness;

		for ( var i = 1; i < this.population_size_setting; ++i )
		{
			
			// Update fittest if necessary.
			
			if ( highest_so_far < this.population[ i ].fitness )
			{
				
				highest_so_far = this.population[ i ].fitness;

				this.fittest_genome = i;

				this.best_fitness = highest_so_far;
				
			}

			// Update worst if necessary.
			
			if ( lowest_so_far > this.population[ i ].fitness  )
			{
				
				lowest_so_far = this.population[ i ].fitness;

				this.worst_fitness = lowest_so_far;
				
			}

			this.total_fitness += this.population[ i ].fitness;


		} // Next chromosome.

		this.average_fitness = this.total_fitness / this.population_size_setting;
		
	}

	this.reset = function ( )
	{
		
		this.total_fitness   = 0;
		this.best_fitness    = 0;
		this.worst_fitness   = 0;
		this.average_fitness = 0;
		this.fittest_genome  = -1;
		
	}

	// This runs the GA for one generation.
	
	this.epoch = function ( old_population )
	{
		
		// Assign the given population to the classes population.
		
		this.population = deep_copy( old_population );
		
		old_population.length = 0;
		
		// Calculate best, worst, average and total fitness.
		
		this.calculate_best_worst_average_total_fitness( );

		// Sort the population (for scaling and elitism) in ascending order.
		
		this.population.sort( function ( a, b ) { return a.fitness - b.fitness; } );		

		// Create a temporary vector to store new chromosomes.
		
		var temp_population = new Array( );

		// Now to add a little elitism we shall add in some copies of the
		// fittest genomes. Make sure we add an EVEN number or the roulette
		// wheel sampling will crash.
		
		if ( !( ( this.number_of_elite_setting * this.number_of_elite_copies_setting ) % 2 ) ) // 1 if even, 0 if odd.
		{
			
			this.grab_n_best( this.number_of_elite_setting, this.number_of_elite_copies_setting, temp_population );
			
		}

		// Now we enter the GA loop.

		// Repeat until a new population is generated.
		
		while ( temp_population.length < this.population_size_setting )
		{
			
			// Grab two chromosomes.
			
			var parents = this.get_chromosome_via_roulette( this.use_ranking_in_selection_setting );

			// Create some offspring via crossover.
			
			var baby1 = new Genome( );
			var baby2 = new Genome( );

			this.crossover( this.population[ parents[ 0 ] ], this.population[ parents[ 1 ] ], baby1, baby2 );

			// Now we mutate.
			
			baby1.weights = this.mutate( baby1.weights );
			baby2.weights = this.mutate( baby2.weights );

			// Now copy into temp population.
			
			temp_population.push( baby1 );
			
			if ( temp_population.length == this.population_size_setting ) break;
			
			temp_population.push( baby2 );
			
		}
		
		if ( temp_population.length > this.population_size_setting )
		{
			
			console.warn( "[Genetic_Algorithm:epoch] New population generation greater than desired population size." );
			
		}

		// Finished so assign new pop back into this.population.
		
		this.population = [ ];
		this.population = deep_copy( temp_population );
		
		// Calculate actual rates.
		
		this.actual_crossover_rate = this.number_of_crossovers / this.crossover_attempts;
		this.actual_mutation_rate  = this.number_of_mutations / this.mutation_attempts;
		
		// Advance generation counter.
		
		this.generation_counter += 1;
		
		// Return a copy of the new population.

		return deep_copy( this.population );
		
	}
	
	this.increase_fitness = function ( index )
	{
		
		if ( ( index > ( this.population_size_setting - 1 ) ) || ( index < 0 ) )
		{
			
			console.error( "[Genetic_Algorithm:increase_fitness] Cannot increase fitness. Index out of bounds of population size." );
			
			return;
			
		}
		
		this.population[ index ].fitness += 1;
		
	}

	// Getter methods.

	this.get_population = function ( )
	{
		
		return deep_copy( this.population );
		
	}
	
	this.get_chromosome_length = function ( )
	{
		
		return deep_copy( this.chromosome_length );
		
	}

	this.get_average_fitness = function ( ) 
	{
		
		this.calculate_best_worst_average_total_fitness( );
		
		return deep_copy( this.average_fitness );
		
	}

	this.get_best_fitness = function ( )
	{
		
		this.calculate_best_worst_average_total_fitness( );
		
		return deep_copy( this.best_fitness );
		
	}
	
	this.get_fittest_genome = function ( )
	{
		
		this.calculate_best_worst_average_total_fitness( );
		
		return deep_copy( this.fittest_genome );
		
	}
	
	this.get_generation_count = function ( )
	{
		
		return deep_copy( this.generation_counter );
		
	}
	
	// Setter methods
	
	this.set_mutation_rate_setting = function ( rate )
	{
		
		this.mutation_rate_setting = parseFloat( rate );
		
	}
	
	this.set_generation_count = function ( count )
	{
		
		this.generation_counter = parseInt( count );
		
	}

}
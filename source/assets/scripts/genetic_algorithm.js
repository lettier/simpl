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

function Genome( genes, fitness )
{

	this.genes = null;
	this.fitness = null;
	
	if ( genes == undefined ) this.genes = new Array( );
	else this.genes = genes;

	if ( fitness == undefined ) this.fitness = 0.0;
	else this.fitness = fitness;
	
	// Used to calculate either the crossover progress or mutation progress.
	// If this genome is created via crossover, use the weighted average
	// based on the cross over point.
	// So if the crossover point is say 9 and the genome length is 10,
	// then the weighted average pf = (p1.f*.9) + (p2.f*.1).
	// In other words the offspring received 90% of its genes from parent one
	// and it received 10% of its genes from parent two so its parent fitness is
	// 90% of parent one's fitness and 10% of parent two's fitness.
	
	this.parent_fitness = 0.0;
	
	// Created by means if this genome was generated either by crossover or mutation.
	// Initially it is created from nothing so set it to -1.
	// 1 = mutation, 0 = crossover and 2 = elitism.
	
	// Note that since the crossover operator and mutation operator are being tracked on how well 
	// they produce offspring that have a higher fitness than their parents,
	// no one offspring can be created by both crossover and mutation only crossover XOR mutation.
	
	this.created_by = -1;	

}

function Genetic_Algorithm( params )
{

	// Size of population.
	
	this.population_size = params.popSize;

	// Amount of genes per genome.
	
	this.number_of_genes_per_genome = params.nGenesPerGenome;	

	// Use rank in selection?
	
	this.use_rank_fitness = params.useRankFitness;
	
	// Probability of genome's crossing over bits.
	// 0.7 is pretty good.
	
	this.crossover_rate                      = params.iCRate;
	this.crossover_rate_minimum              = 0.001;
	this.crossover_rate_adjustment           = 0.01;
	this.crossover_operator_progress_average = 0.0;
	this.actual_crossover_rate               = 0.0;	
	this.total_number_of_crossovers          = 0;
	this.total_number_of_crossover_attempts  = 0;
	
	// Probability that a genomes bits will mutate.
	// Try figures around 0.05 to 0.3-ish.

	this.mutation_rate                      = params.iMRate;
	this.mutation_rate_minimum              = 0.001;
	this.mutation_rate_adjustment           = 0.01;
	this.mutation_operator_progress_average = 0.0;
	this.actual_mutation_rate               = 0.0;
	this.total_number_of_mutations          = 0;
	this.total_number_of_mutation_attempts  = 0;
	
	// Set the elite genes.
	
	this.number_of_elite        = params.nElite;	
	this.number_of_elite_copies = params.nEliteCopies;	
	
	// This holds the entire population of genomes.
	
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
	
	this.fittest_genome_index = -1;

	// Keep track of the worst genome.
	
	this.weakest_genome_index = -1;

	// Generation number.
	
	this.generation_number = 0;
	
	// Initialize population with genomes consisting of random
	// genes and all fitness's set to zero.
	
	for ( var i = 0; i < this.population_size; ++i )
	{
		
		this.population.push( new Genome( ) );

		for ( var j = 0; j < this.number_of_genes_per_genome; ++j )
		{
			
			this.population[ i ].genes.push( get_random_float( -1.0, 1.0 ) );
			
		}
		
	}
	
	this.replace_population_genes = function ( replacement_population_genes )
	{
		
		if ( replacement_population_genes == undefined || 
			replacement_population_genes.length == 0  || 
			replacement_population_genes.length != ( this.population_size * this.number_of_genes_per_genome ) )
		{
			
			console.error( "[Genetic_Algorithm:replace_population_genes] Replacement population genes invalid."   );
			
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
		
		for ( var i = 0; i < this.population_size; ++i )
		{

			this.population[ i ].genes = [ ];
			
			for ( var j = 0; j < this.number_of_genes_per_genome; ++j )
			{
				
				this.population[ i ].genes.push( replacement_population_genes[ k ] );
				
				k += 1;

			}
			
		}
		
	}

	this.crossover_operator = function ( parent_one_index, parent_two_index )
	{
		
		// One point crossover operator.
		
		var offspring_one = new Genome( );
		var offspring_two = new Genome( );

		// Determine a crossover point.
		
		var crossover_point = get_random_integer( 0, ( this.number_of_genes_per_genome - 1 ) );

		// Cross the parent's genes in the offspring.
		
		offspring_one.genes = [ ];
		offspring_two.genes = [ ];
		
		offspring_one.fitness = 0;
		offspring_two.fitness = 0;
		
		offspring_one.parent_fitness = 0;
		offspring_two.parent_fitness = 0;
		
		for ( var i = 0; i < crossover_point; ++i )
		{
			
			offspring_one.genes.push( deep_copy( this.population[ parent_one_index ].genes[ i ] ) );
			offspring_two.genes.push( deep_copy( this.population[ parent_two_index ].genes[ i ] ) );
			
		}

		for ( var i = crossover_point; i < this.number_of_genes_per_genome; ++i )
		{
			
			offspring_one.genes.push( deep_copy( this.population[ parent_two_index ].genes[ i ] ) );
			offspring_two.genes.push( deep_copy( this.population[ parent_one_index ].genes[ i ] ) );
			
		}
		
		// Weighted average fitness of the parents based on crossover point
		// determining percentage of genes received from parent one and parent two.
		
		offspring_one.parent_fitness = ( this.population[ parent_one_index ].fitness * ( crossover_point / ( this.number_of_genes_per_genome - 1 ) ) ) + ( this.population[ parent_two_index ].fitness * ( ( ( this.number_of_genes_per_genome - 1 ) - crossover_point ) / ( this.number_of_genes_per_genome - 1 ) ) );
		offspring_two.parent_fitness = ( this.population[ parent_two_index ].fitness * ( crossover_point / ( this.number_of_genes_per_genome - 1 ) ) ) + ( this.population[ parent_one_index ].fitness * ( ( ( this.number_of_genes_per_genome - 1 ) - crossover_point ) / ( this.number_of_genes_per_genome - 1 ) ) );
		
		offspring_one.created_by = 0;		
		offspring_two.created_by = 0;
		
		return { one: offspring_one, two: offspring_two };
		
	}

	this.mutation_operator = function ( parent_one_index, parent_two_index )
	{

		// Reference: http://www.nashcoding.com/2010/07/07/evolutionary-algorithms-the-little-things-youd-never-guess-part-1/#fn-28-1
		
		function gaussian_distribution( mean, standard_deviation )
		{
			
			// Two uniformally distributed random variable samplings.
			
			var x1 = Math.random( );
			var x2 = Math.random( );

			// The method requires sampling from a uniform random of (0,1]
			// but Math.random( ) returns a sample of [0,1).
			
			if ( x1 == 0.0 ) x1 = 1.0;
			if ( x2 == 0.0 ) x2 = 1.0;
			
			// Box-Muller transformation for Z_0.

			var y1 = Math.sqrt( -2.0 * Math.log( x1 ) ) * Math.cos( 2.0 * Math.PI * x2 );
			
			return ( y1 * standard_deviation ) + mean;
			
		}
		
		var offspring_one = new Genome( );
		var offspring_two = new Genome( );
		
		offspring_one.genes = [ ];
		offspring_two.genes = [ ];
		
		offspring_one.genes = deep_copy( this.population[ parent_one_index ].genes );
		offspring_two.genes = deep_copy( this.population[ parent_two_index ].genes );
		
		offspring_one.fitness = 0;
		offspring_two.fitness = 0;
		
		offspring_one.parent_fitness = 0;
		offspring_two.parent_fitness = 0;
		
		for ( var i = 0; i < this.number_of_genes_per_genome; ++i )
		{

			// Mutate this parameter by sampling a value from a normal distribution
			// where the mean is the current parameter value and the standard deviation
			// the is mutation step = mutation rate in the range [0,1].

			// Clamp the genes to range [-1,1].
			
			offspring_one.genes[ i ] = gaussian_distribution( offspring_one.genes[ i ], this.mutation_rate );			
			offspring_one.genes[ i ] = get_clamped_value( offspring_one.genes[ i ], -1.0, 1.0 );
			
			offspring_two.genes[ i ] = gaussian_distribution( offspring_two.genes[ i ], this.mutation_rate );			
			offspring_two.genes[ i ] = get_clamped_value( offspring_two.genes[ i ], -1.0, 1.0 );
			
		}
			
		offspring_one.parent_fitness = deep_copy( this.population[ parent_one_index ].fitness );
		offspring_two.parent_fitness = deep_copy( this.population[ parent_two_index ].fitness );
		
		offspring_one.created_by = 1;		
		offspring_two.created_by = 1;
		
		return { one: offspring_one, two: offspring_two };
		
	}

	this.selection_operator = function ( )
	{
		
		// Roulette selection of two genomes.
		
		if ( !this.use_rank_fitness )
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
			
			var genome_indexes_selected = new Array( );
			
			if ( this.total_fitness == 0 )
			{
				
				// So that we don't divide by zero.
				// This means genomes all have zero fitness 
				// so just select two random genome indexes.
				
				genome_indexes_selected.push( get_random_integer( 0, this.population_size - 1 ) );
				
				genome_indexes_selected.push( get_random_integer( 0, this.population_size - 1 ) );
				
				return genome_indexes_selected;
				
			}

			probabilities.push( this.population[ 0 ].fitness / this.total_fitness );		
			
			for ( var i = 1; i < this.population_size; ++i )
			{
				
				probabilities.push( probabilities[ i - 1 ] + ( this.population[ i ].fitness / this.total_fitness ) );
				
			}
			
			while( genome_indexes_selected.length < 2 )
			{
				
				var random_number = get_random_float( 0.0, 1.0 );
				
				for ( var i = 0; i < this.population_size; ++i )
				{
					
					if ( random_number <= probabilities[ i ] )
					{
						
						genome_indexes_selected.push( i );
						
					}
					
				}
				
			}
			
			return genome_indexes_selected;
			
		}
		else
		{
			
			// Assumes population is in ascending order by fitness.
			// This won't catch every case but some.
			
			if ( this.population[ this.population_size - 1 ].fitness < this.population[ 0 ].fitness ) return null;
			
			// Give the worst genome a rank fitness of 1.
			// Give the second worst genome a rank fitness of 2.
			// ...
			// Give the best genome a rank fitness of the population size.
			
			// Now, based on rank fitness, do a roulette selection where the
			// probabilities are based on the rank fitness.
			
			var probabilities = new Array( );
			
			var genome_indexes_selected = new Array( );
			
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
			
			var total_rank_fitness = ( this.population_size * ( this.population_size + 1 ) ) / 2;

			probabilities.push( 1 / total_rank_fitness ); // First rank fitness probability.
			
			// Rest of the rank fitness probabilities.
			
			for ( var i = 1; i < this.population_size; ++i )
			{
				
				probabilities.push( probabilities[ i - 1 ] + ( ( i + 1 ) / total_rank_fitness ) );
				
			}
			
			while( genome_indexes_selected.length < 2 )
			{
				
				var random_number = get_random_float( 0.0, 1.0 );
				
				for ( var i = 0; i < this.population_size; ++i )
				{
					
					if ( random_number <= probabilities[ i ] )
					{
						
						genome_indexes_selected.push( i );
						
					}
					
				}
				
			}
			
			return genome_indexes_selected;
			
		}
		
	}

	this.elitism_operator = function ( nBest, nCopies, new_population ) 
	{

		if ( nBest > this.population_size ) nBest = this.population_size;
		
		if ( ( nBest * nCopies ) > this.population_size ) nCopies = Math.floor( this.population_size / nBest );
		
		// Assumes this.population is sorted in ascending order where g_0.f_0 < g_1.f_1 < g_n.fn.
		// Thus, the while loops pulls the fittest nBest from this.population from
		// nBest up to n-1 in this.population[].
		// [ g_0, g_1, g_2, g_3, ..., g_nBest, g_nBest+1, g_nBest+2, ..., g_n-1 ]
		// It copies the nBest_i by nCopies so say this.population looks like
		// [ 0, 1, 2, 3, 4 ], nBest is 3, and nCopies is 2 then population looks like
		// [ 2, 3, 4 ].
		// Or say this.population is [ 0, 1, 2, 3, 4, 5 ], nBest is 2, and nCopies is 2
		// then population looks like [ 4, 4, 5, 5 ].
		
		// Add the required amount of copies of the n most fittest to the supplied array.
		
		while( nBest-- )
		{
			
			for ( var i = 0; i < nCopies; ++i )
			{
				
				var genome_temp = deep_copy( this.population[ ( this.population_size - 1 ) - nBest ] );
				
				genome_temp.fitness        = 0;
				genome_temp.parent_fitness = 0;
				genome_temp.created_by     = 2;
				
				new_population.push( genome_temp );
				
				if ( new_population.length == this.population_size ) return;
				
			}
			
		}
		
	}

	this.evaluate_population = function ( )
	{

		this.reset_population_evaluation( );

		var highest_so_far = this.population[ 0 ].fitness;
		var lowest_so_far  = this.population[ 0 ].fitness;
		
		this.fittest_genome_index = 0;
		this.weakest_genome_index = 0;
		
		this.total_fitness  = this.population[ 0 ].fitness;		
		this.best_fitness   = this.population[ 0 ].fitness;
		this.worst_fitness  = this.population[ 0 ].fitness;

		for ( var i = 1; i < this.population_size; ++i )
		{
			
			// Update fittest if necessary.
			
			if ( highest_so_far < this.population[ i ].fitness )
			{
				
				highest_so_far = this.population[ i ].fitness;

				this.fittest_genome_index = i;

				this.best_fitness = highest_so_far;
				
			}

			// Update worst if necessary.
			
			if ( lowest_so_far > this.population[ i ].fitness  )
			{
				
				lowest_so_far = this.population[ i ].fitness;
				
				this.weakest_genome_index = i;

				this.worst_fitness = lowest_so_far;
				
			}

			this.total_fitness += this.population[ i ].fitness;


		} // Next genome.

		this.average_fitness = this.total_fitness / this.population_size;
		
	}

	this.reset_population_evaluation = function ( )
	{
		
		this.total_fitness         = 0;
		this.best_fitness          = 0;
		this.worst_fitness         = 0;
		this.average_fitness       = 0;
		this.fittest_genome_index  = -1;
		this.weakest_genome_index  = -1;
		
	}
	
	this.adjust_crossover_and_mutation_rate = function ( )
	{
		
		// Calculate the crossover and mutation operators' progress where 
		// their progress is based on how well they produced offspring that
		// had a better fitness than their parent.
		
		var crossover_operator_progress_sum = 0;
		var number_of_crossovers            = 0;
		
		var mutation_operator_progress_sum  = 0;
		var number_of_mutations             = 0;
		
		// Sum all of the progresses.
		
		for ( var i = 0; i < this.population_size; ++i )
		{
			
			if ( this.population[ i ].created_by == 0 ) // Created by crossover.
			{
				
				crossover_operator_progress_sum += ( this.population[ i ].fitness - this.population[ i ].parent_fitness );
				
				number_of_crossovers += 1;
				
			}
			else if ( this.population[ i ].created_by == 1 ) // Created by mutation.
			{
				
				mutation_operator_progress_sum  += ( this.population[ i ].fitness - this.population[ i ].parent_fitness );
				
				number_of_mutations += 1;
				
			}
			
		}
		
		// Now calculate the average crossover and mutation progress for the population.
		
		this.crossover_operator_progress_average = 0.0;
		this.mutation_operator_progress_average  = 0.0;
		
		if ( number_of_crossovers != 0 )
		{
			
			this.crossover_operator_progress_average = ( crossover_operator_progress_sum ) / ( number_of_crossovers );			
			
		}
		
		if ( number_of_mutations != 0 )
		{
			
			this.mutation_operator_progress_average  = ( mutation_operator_progress_sum ) / ( number_of_mutations );			
			
		}
		
		// Adjust crossover and mutation rate adjustments.
		
		if ( this.best_fitness > this.worst_fitness )
		{
			
			this.crossover_rate_adjustment = 0.01 * ( ( this.best_fitness - this.average_fitness ) / ( this.best_fitness - this.worst_fitness ) );
			
			this.mutation_rate_adjustment  = 0.01 * ( ( this.best_fitness - this.average_fitness ) / ( this.best_fitness - this.worst_fitness ) );
			
		}
		else if ( this.best_fitness = this.average_fitness )
		{
			
			this.crossover_rate_adjustment = 0.01;
			
			this.mutation_rate_adjustment  = 0.01;
			
		}
		
		// Adjust crossover and mutation rates.
		
		if ( this.crossover_operator_progress_average > this.mutation_operator_progress_average )
		{
		
			this.crossover_rate = this.crossover_rate + this.crossover_rate_adjustment;
			
			this.mutation_rate  = this.mutation_rate  - this.mutation_rate_adjustment;
			
		}
		else if ( this.crossover_operator_progress_average < this.mutation_operator_progress_average )
		{
		
			this.crossover_rate = this.crossover_rate - this.crossover_rate_adjustment;
			
			this.mutation_rate  = this.mutation_rate  + this.mutation_rate_adjustment;
			
		}
		else if ( this.crossover_operator_progress_average == this.mutation_operator_progress_average )
		{
			
			// Do not adjust.
			
		}
		
		this.crossover_rate = get_clamped_value( this.crossover_rate, this.crossover_rate_minimum, 1.0 );
		
		this.mutation_rate  = get_clamped_value( this.mutation_rate,  this.mutation_rate_minimum,  1.0 );
		
	}
	
	this.sort_population = function ( descending )
	{
		
		if ( descending == undefined || descending == false )
		{
			
			this.population.sort( function ( a, b ) { return a.fitness - b.fitness; } );
			
		}
		else
		{
			
			this.population.sort( function ( a, b ) { return b.fitness - a.fitness; } );
			
		}
		
	}
	
	this.generate_new_generation = function ( )
	{

		// Create a temporary population to store newly created generation.
		
		var new_population = new Array( );

		// Now to add a little elitism we shall add in some copies of the
		// fittest genomes. Make sure we add an EVEN number or the roulette
		// wheel sampling will crash.
		
		if ( !( ( this.number_of_elite * this.number_of_elite_copies ) % 2 ) ) // 1 if even, 0 if odd.
		{
			
			this.elitism_operator( this.number_of_elite, this.number_of_elite_copies, new_population );
			
		}	

		// Now we enter the GA loop.

		// Repeat until a new population is generated.
		
		while ( new_population.length < this.population_size )
		{
			
			// Select two genome indexes from population.
			
			var parents = this.selection_operator( );

			// Create some offspring via crossover. May not get into new population.
			// So it would be like it never happened.
			// Just creating them now since two are made at a time.
			
			var crossover_offspring = this.crossover_operator( parents[ 0 ], parents[ 1 ] );
			
			// Create some offspring via mutation. May not get into new population.
			// So it would be like it never happened.
			// Just creating them now since two are made at a time.
			
			var mutation_offspring  = this.mutation_operator( parents[ 0 ], parents[ 1 ] );
			
			// Attempt to add a crossover offspring based on the crossover rate.
			
			if ( new_population.length == this.population_size ) break;
			
			this.total_number_of_crossover_attempts += 1;

			if ( get_random_float( 0.0, 1.0 ) <= this.crossover_rate )
			{

				this.total_number_of_crossovers += 1;
				
				// Now copy the offspring into the new population.				
				
				new_population.push( crossover_offspring.one );
				
			}
			
			// Attempt to add a mutation/mutant offspring based on the mutation rate.
			
			if ( new_population.length == this.population_size ) break;
			
			this.total_number_of_mutation_attempts += 1;
			
			if ( get_random_float( 0.0, 1.0 ) <= this.mutation_rate )
			{

				this.total_number_of_mutations += 1;
				
				// Now copy the offspring into the new population.
				
				new_population.push( mutation_offspring.one );				
				
			}			
			
			// Attempt to add a crossover offspring based on rate.
			
			if ( new_population.length == this.population_size ) break;
			
			this.total_number_of_crossover_attempts += 1;

			if ( get_random_float( 0.0, 1.0 ) <= this.crossover_rate )
			{

				this.total_number_of_crossovers += 1;
				
				// Now copy the offspring into the new population.				
				
				new_population.push( crossover_offspring.two );
				
			}
			
			// Attempt to add a mutation/mutant offspring based on the mutation rate.
			
			if ( new_population.length == this.population_size ) break;
			
			this.total_number_of_mutation_attempts += 1;
			
			if ( get_random_float( 0.0, 1.0 ) <= this.mutation_rate )
			{

				this.total_number_of_mutations += 1;
				
				// Now copy the offspring into the new population.
				
				new_population.push( mutation_offspring.two );				
				
			}
			
		}
		
		if ( new_population.length > this.population_size )
		{
			
			console.warn( "[Genetic_Algorithm:generate_new_generation] New population larger than desired population size setting." );
			
		}

		// Finished so assign new pop to the current population.
		
		this.population = [ ];
		this.population = deep_copy( new_population );
		new_population = [ ];
		
		// Calculate actual rates.
		
		this.actual_crossover_rate = this.total_number_of_crossovers / this.total_number_of_crossover_attempts;
		this.actual_mutation_rate  = this.total_number_of_mutations  / this.total_number_of_mutation_attempts;
		
		// Advance generation counter.
		
		this.generation_number += 1;
		
	}	

	// Getter methods.

	this.get_population = function ( )
	{
		
		return deep_copy( this.population );
		
	}
	
	this.get_population_size = function ( )
	{
		
		return deep_copy( this.population_size );
		
	}
	
	this.get_number_of_genes_per_genome = function ( )
	{
		
		return deep_copy( this.number_of_genes_per_genome );
		
	}
	
	this.get_genome_fitness = function ( index )
	{
		
		index = parseInt( index );
		
		if ( ( index > ( this.population_size - 1 ) ) || ( index < 0 ) )
		{
			
			console.error( "[Genetic_Algorithm:get_genome_fitness] Index out of bounds of population size." );
			
			return;
			
		}
		
		return deep_copy( this.population[ index ].fitness );
		
	}
	
	this.get_genome_genes = function ( index )
	{
		
		index = parseInt( index );
		
		if ( ( index > ( this.population_size - 1 ) ) || ( index < 0 ) )
		{
			
			console.error( "[Genetic_Algorithm:get_genome_genes] Index out of bounds of population size." );
			
			return;
			
		}
		
		return deep_copy( this.population[ index ].genes );
		
	}
	
	this.get_genome_genes_flattened = function ( index )
	{
		
		index = parseInt( index );
		
		if ( ( index > ( this.population_size - 1 ) ) || ( index < 0 ) )
		{
			
			console.error( "[Genetic_Algorithm:get_genome_genes_flattened] Index out of bounds of population size." );
			
			return;
			
		}
		
		return deep_copy( this.population[ index ].genes.join( "," ) );
		
	}
	
	this.get_population_genes_flattened = function ( )
	{
		
		var population_genes = "";
		
		for ( var i = 0; i < this.population_size - 1; ++i )
		{
			
			population_genes += deep_copy( this.population[ i ].genes.join( "," ) + "," );
			
		}
		
		population_genes += deep_copy( this.population[ this.population_size - 1 ].genes.join( "," ) );
		
		return population_genes;
		
	}

	this.get_average_fitness = function ( ) 
	{
		
		this.evaluate_population( );
		
		return deep_copy( this.average_fitness );
		
	}

	this.get_best_fitness = function ( )
	{
		
		this.evaluate_population( );
		
		return deep_copy( this.best_fitness );
		
	}
	
	this.get_fittest_genome_index = function ( )
	{
		
		this.evaluate_population( );
		
		return deep_copy( this.fittest_genome_index );
		
	}
	
	this.get_weakest_genome_index = function ( )
	{
		
		this.evaluate_population( );
		
		return deep_copy( this.weakest_genome_index );
		
	}
	
	this.get_crossover_rate = function ( )
	{
		
		return deep_copy( this.crossover_rate );
		
	}
	
	this.get_mutation_rate = function ( )
	{
		
		return deep_copy( this.mutation_rate );
		
	}
	
	this.get_generation_number = function ( )
	{
		
		return deep_copy( this.generation_number );
		
	}
	
	// Setter methods.
	
	this.set_crossover_rate = function ( rate )
	{
		
		this.crossover_rate = parseFloat( rate );
		
	}
	
	this.set_mutation_rate = function ( rate )
	{
		
		this.mutation_rate = parseFloat( rate );
		
	}
	
	this.set_generation_number = function ( number )
	{
		
		number = parseInt( number );
		
		this.generation_number = number;
		
	}
	
	this.set_genome_fitness = function ( index, fitness )
	{
		
		index   = parseInt( index );
		fitness = parseFloat( fitness );
		
		if ( ( index > ( this.population_size - 1 ) ) || ( index < 0 ) )
		{
			
			console.error( "[Genetic_Algorithm:set_genome_fitness] Index out of bounds of population size." );
			
			return;
			
		}
		
		this.population[ index ].fitness = fitness;	
	}

}
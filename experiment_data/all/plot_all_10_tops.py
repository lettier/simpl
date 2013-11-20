from matplotlib.colors import colorConverter;
from mpl_toolkits.mplot3d import Axes3D;
from matplotlib.collections import PolyCollection;
from matplotlib.collections import LineCollection;
from matplotlib.lines import Line2D;
import matplotlib as mpl;
import matplotlib.pyplot as plt;
import numpy as np;

# mpl.rcParams[ 'font.family' ] = 'serif';

fig = plt.figure( figsize = ( 6 * 3.13, 5 * 3.13 ), tight_layout = False, linewidth = 3, edgecolor = "k" );
fig.suptitle( "\nSimPL\n\nFitness of every 10th generation top performer.", fontsize = 18, family = "serif" );
ax = fig.gca( projection = "3d" );

cc = lambda arg: colorConverter.to_rgba( arg, alpha = 0.8 );

csv_file = open( "SIMPL_EXP_10TH_TOPS_all.csv", "r" );

exp1 = [ ];
exp2 = [ ];
exp3 = [ ];
exp4 = [ ];
exp5 = [ ];
exp6 = [ ];
exp7 = [ ];

line = csv_file.readline( );
line = line.rstrip( "\n" );

max_z = 0;

while line != "":

	line = line.split( "," );
	
	for i in xrange( 0, len( line ) ):
	
		if ( max_z < float( line[ i ] ) ):
		
			max_z = float( line[ i ] );
	
	exp1.append( float( line[ 0 ] ) );
	exp2.append( float( line[ 1 ] ) );
	exp3.append( float( line[ 2 ] ) );
	exp4.append( float( line[ 3 ] ) );
	exp5.append( float( line[ 4 ] ) );
	exp6.append( float( line[ 5 ] ) );
	exp7.append( float( line[ 6 ] ) );
	
	line = csv_file.readline( );
	line = line.rstrip( "\n" );

# Begin polygons.

exp1_poly = list( exp1 );
exp2_poly = list( exp2 );
exp3_poly = list( exp3 );
exp4_poly = list( exp4 );
exp5_poly = list( exp5 );
exp6_poly = list( exp6 );
exp7_poly = list( exp7 );
	
exps_polys = [ exp1_poly, exp2_poly, exp3_poly, exp4_poly, exp5_poly, exp6_poly, exp7_poly ];

xs = np.arange( 9, 100, 10 );
	
zs = [ 1, 2, 3, 4, 5, 6, 7 ];

verts = [ ];

i = 0

for z in zs:

	ys = exps_polys[ i ];

	verts.append( list( zip( xs, ys ) ) );

	i = i + 1;
	
for i in xrange( 0, len( verts ) ):

	verts[ i ].insert( 0, ( xs[ 0 ], 0.0 ) );
	
	verts[ i ].append( ( xs[ -1 ], 0.0 ) ); 

colors = [ cc('r'), cc('g'), cc('b'), cc('y'), cc('c'), cc('m'), cc('k') ];

poly_collection = PolyCollection( verts, facecolors = colors, edgecolors = ( 0.0, 0.0, 0.0, 0.0 ), linewidths = 3, closed = False );

poly_collection.set_alpha( .07 );

# Begin lines.

exp1_line = list( exp1 );
exp2_line = list( exp2 );
exp3_line = list( exp3 );
exp4_line = list( exp4 );
exp5_line = list( exp5 );
exp6_line = list( exp6 );
exp7_line = list( exp7 );

exps_lines = [ exp1_line, exp2_line, exp3_line, exp4_line, exp5_line, exp6_line, exp7_line ];

verts = [ ];

i = 0

for z in zs:

	ys = exps_lines[ i ];

	verts.append( list( zip( xs, ys ) ) );

	i = i + 1;

line_collection = LineCollection( verts, colors = colors, linestyles = "solid", linewidths = 2 );

ax.add_collection3d( poly_collection, zs = zs, zdir = 'y' );
ax.add_collection3d( line_collection, zs = zs, zdir = 'y' );

# Set labels and ticks.

plt.xticks( np.arange( 9, 100, 10 ) );
ax.set_xlabel( "Generation", family = "serif" );
ax.set_xlim3d( 0, 100 );
ax.set_ylabel( "Experiments", family = "serif" );
ax.set_ylim3d( 1, 7 );
ax.set_zticks( np.arange( 0, 4001, 500 ) );
ax.set_zlabel( "Fitness", family = "serif" );
ax.set_zlim3d( 0, 4000 );

# Make and show legend.

def make_proxy( zvalue, scalar_mappable, colors, **kwargs ):

	color = colors[ zvalue - 1 ];
	
	return Line2D( [ 0, 1 ], [ 0, 1 ], color = color, **kwargs);
	
proxies = [ make_proxy( item, poly_collection, colors, linewidth = 5 ) for item in zs ]
ax.legend( proxies, [ "Experiment 1", "Experiment 2", "Experiment 3", "Experiment 4", "Experiment 5", "Experiment 6", "Experiment 7" ] );

plt.tight_layout( );

# Draw borders.

dpi = fig.get_dpi( );
width, height = [ float( v * dpi ) for v in fig.get_size_inches( ) ];

plt.subplots_adjust( left = ( 3 / ( width ) ), right = 1 - ( 3 / ( width ) ), top = 1 - ( 3 / ( height) ), bottom = ( 3 / ( width ) ) );

# Show plot.

plt.show()


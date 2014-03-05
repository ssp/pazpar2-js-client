module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),


		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js'],
			options: {
				globals: {
					jQuery: true
				},
				sub: true
			}
		},

		concat: {
			build: {
				dest: 'pz2-client.js',
				src: [
					'pz2.js',
					'src/main.js',
					'src/parts/config.js',
					'src/parts/init.js',
					'src/parts/*.js', 
					'src/localisation/*'
				]
			},
			flot: {
				dest: 'jquery.flot+selection.js',
				src: [
					'flot/jquery.flot.js',
					'flot/jquery.flot.selection.js'
				]
			}
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				files: {
					'pz2-client.min.js': ['pz2-client.js']
				}
			},
			flot: {
				files: {
					'jquery.flot+selection.min.js': ['jquery.flot+selection.js']
				}
			}
		},

		watch: {
			files: ['<%= jshint.files %>', 'pz2.js'],
			tasks: ['concat', 'uglify', 'jshint']
		}

	});


	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'watch']);

};
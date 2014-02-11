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
				src: [
					'src/main.js',
					'src/parts/config.js',
					'src/parts/init.js',
					'src/parts/*.js',
					'src/localisation/*'
				],
				dest: 'pz2-client.js'
			}
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'pz2-client.js',
				dest: 'pz2-client.min.js'
			}
		},

		watch: {
			files: ['<%= jshint.files %>'],
			tasks: ['concat', 'uglify', 'jshint']
		}

	});


	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'watch']);

};
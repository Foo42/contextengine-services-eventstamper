module.exports = function (grunt) {

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-mocha');

  grunt.initConfig({
    // Configure a mochaTest task
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js']
      }
    },
    mocha: {
      test: {
        src: ['test/client/mocha/**/*.html'],
        options: {
          run: true
        }
      },
    },
    watch: {
      scripts: {
        files: ['**/*.js'],
        tasks: ['quickFeedback'],
      },
    },
  });

  grunt.registerTask('quickFeedback', ['mochaTest']);
  grunt.registerTask('default', ['quickFeedback']);

};

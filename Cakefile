{exec} = require 'child_process'
path = require 'path'

buildFiles = [
	{
		src: 'src/shopifapi.coffee'
		out: 'lib/shopifapi.js'
	}
	{
		src: 'src/log.coffee'
		out: 'lib/log.js'
	}
]
coffeeCmd = path.join 'node_modules', '.bin', 'coffee'

task 'build', ->
	buildFiles.forEach (file) ->
		buildCmd = "#{coffeeCmd} -j #{file.out} -c #{file.src}"
		exec buildCmd, (err, stdout, stderr) ->
			if err
				console.log(err) 
			else
				console.log "Compiled #{file.out}"
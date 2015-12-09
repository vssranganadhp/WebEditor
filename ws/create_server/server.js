var ws = require("../")
var fs = require("fs")
var log_file = "/tmp/log.json";
var pollInterval = null;
var server = ws.createServer(function (connection) {
	connection.on("text", function (str) {
		var obj = JSON.parse(str);
		if (!connection.nickname) {
			connection.nickname = obj.nickname;
			var connections = server.getConnections();
			var totalClients = [];
			server.connections.forEach(function(con){
				totalClients.push(con.nickname);
			});
			connection.sendText(JSON.stringify(totalClients));
			broadcast('{"new_guest":"'+connection.nickname+'"}');
		} else if(obj.msg){
			var msg = obj.msg;
			broadcast('{"msg":"'+msg+'","name":"'+connection.nickname+'"}');
		} else if(obj.log){
			getLog(function(data){
				var file_str = JSON.stringify(data);
				console.log(file_str);
				// connection.sendText(file_str);
			})
		} else {
			broadcast(str);
		}
	})
	connection.on("close", function () {
		broadcast('{"end_guest":"'+connection.nickname+'"}');
	})
	/*		Polling from server 	*/
	// if(pollInterval == null){
	// 	pollInterval = setInterval(function(){
	// 		var connections = server.getConnections();
	// 		var totalClients = [];
	// 		server.connections.forEach(function(con){
	// 			totalClients.push(con.nickname);
	// 		});
	// 		broadcast(JSON.stringify(totalClients));
	// 	},3000);
	// }
})
server.listen(8081);

function broadcast(str) {
	// console.log(str);
	server.connections.forEach(function (connection) {
		connection.sendText(str);
	})
	var obj = JSON.parse(str);
	if(!obj['typing'] && !obj['text'])
		saveToFile(str);
}

function saveToFile(str){
	fs.exists(log_file,function(exists){
		if(!exists){
			str = "["+str+"]";
			fs.writeFile(log_file,str,function(err){
				
			});
		} else {
			fs.readFile(log_file,function(readErr,data){
				var new_data = data.slice(0,-1)+","+str+"]";
				// console.log(new_data);
				fs.writeFile(log_file,new_data,{flag:'w'},function(err){
					if(err){
						console.log("Error in writing to file");
					}
				});
			})
		}
	})
}

function getLog(callback){
	fs.readFile(log_file,function(err,data){
		if(typeof callback == 'function'){
			callback(data);
		}
	})
}
'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('PipelinesCtrl', ['$scope', '$http', 'Socket', 'PipelineService', 'Session', function($scope, $http, Socket, PipelineService, Session) {
    // Set for refresh
	$http.defaults.headers.common['token'] = Session.token;

	$scope.alerts = [];

	// Set data
	var pipelines = PipelineService.query();
  $scope.pipelines = pipelines;
  console.log(pipelines);

  // Search input
  $scope.search = function(item) {
  	if (item.name.indexOf($scope.query)!=-1 || item.origin_id.indexOf($scope.query)!=-1 || angular.isUndefined($scope.query)) {           
      return true;
    }
    return false;
	};

	$scope.deletePipeline = function (_id) {
    PipelineService.remove({ id: _id }, function (response) {
    	$scope.pipelines = PipelineService.query();
    	$scope.alerts.push({ type: 'success', msg: 'Pipeline deleted successfully.'});
    }, function (error) {
      $scope.alerts.push({ type: 'danger', msg: error.status + ": " + error.data});
    });
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

    // Push notifications
	Socket.on('connectionStatus', function (msg) {
		console.log(msg);
   	});

    Socket.on('newPipeline', function (pipeline) {
    	console.log("newPipeline by socket");
		pipelines.push(pipeline);
		$scope.pipelines = pipelines;
    });

	Socket.on('newDataset', function (pipeline) {
		console.log("newDataset by socket");
		for(var i in pipelines) {
			if(pipelines[i]._id == pipeline._id) {
				pipelines[i].datasets = pipeline.datasets;
			}
		}
		$scope.pipelines = pipelines;
   	});

	// Destroy on navigate away
    $scope.$on('$destroy', function (event) {
        Socket.getSocket().removeAllListeners();
    });
  }])  
 .controller('PipelineDetailCtrl', ['$scope', '$http', '$routeParams', 'Socket', 'PipelineService', 'DataProcessing', 'Session', function($scope, $http, $routeParams, Socket, PipelineService, DataProcessing, Session) {
	// Set for refresh
	$http.defaults.headers.common['token'] = Session.token; 

	// Get and resolve pipeline
	var pipeline = PipelineService.get({id: $routeParams.id, tool: []});

		// Resolve new pipeline
		pipeline.$promise.then(function(pipeline) {
			console.log(pipeline);

			// D3 directive
			$scope.data = pipeline;

			// Detail window
			$scope.pipeline = pipeline;
			$scope.earliestDate = DataProcessing.earliestDate(pipeline);
			$scope.latestDate = DataProcessing.latestDate(pipeline);

			// Checkboxes
			$scope.keys = DataProcessing.getDatasetKeys(pipeline);
			$scope.selection = DataProcessing.getDatasetKeys(pipeline);
			$scope.toggleSelection = function toggleSelection(key) {
			  var idx = $scope.selection.indexOf(key);

			  // Is currently selected
			  if (idx > -1) {
			    $scope.selection.splice(idx, 1);
			  }

			  // Is newly selected
			  else {
			    $scope.selection.push(key);
			  }
			};
    });

		// Date updates for pipeline
    Socket.on('updatedObject', function (date) {
    	console.log("updatedObject by socket");
			$scope.date = date;
    });

		// Destroy on navigate away
    $scope.$on('$destroy', function (event) {
        Socket.getSocket().removeAllListeners();
    });

    // Get Pipeline with tools
    $scope.getPipeline = function(){

    	var tools = [];
    	var tool;

			var keys = $scope.selection;
			if(keys.length != 0) {
				tool = {
					keys: keys,
					task: "selectDatasets"
				}
				tools.push(tool);
				console.log(tool);
			}

    	var begin = $scope.dateDropDownInput1;
    	var end = $scope.dateDropDownInput2;
    	if(typeof begin !== "undefined" && typeof end !== "undefined") {
				begin = moment(begin).format('DD MM YYYY, HH:mm:ss');
				end = moment(end).format('DD MM YYYY, HH:mm:ss');

				tool = {
					begin: begin,
					end: end,
					task: "trimPipeline"
				}
				tools.push(tool);
				console.log(tool);
			}

			var pipeline = PipelineService.get({id: $routeParams.id, tool: tools});

			pipeline.$promise.then(function(newdata) {
				console.log(newdata);
				$scope.newdata = newdata;
	  	});
		};

  }]) 
  .controller('RegisterCtrl', ['$scope', '$http', 'UserService', function($scope, $http, UserService) {
    $scope.addUser = function(){
    	var user = {name:$scope.newUser.username, email:$scope.newUser.email, password:$scope.newUser.password1};
	    UserService.create(user);

	    $scope.newUser.username = '';
	    $scope.newUser.email = '';
	    $scope.newUser.password1 = '';
	    $scope.newUser.password2 = '';
	};
  }])
  .controller('SessionCtrl', ['$scope', '$http', '$location', '$cookieStore', 'SessionInService', 'SessionOutService', 'Session', function($scope, $http, $location, $cookieStore, SessionInService, SessionOutService, Session) {
	$scope.Session = Session;

	$scope.loginUser = function(){
		var session = {email:$scope.user.email, password:$scope.user.password};
	    console.log(session);
		$http.defaults.useXDomain = true;
		delete $http.defaults.headers.common['X-Requested-With'];
	    SessionInService.create(session, function(data){

			console.log(data);

			console.log(data.token);
			Session.isLogged = true;
			Session.token = data.token;

			$cookieStore.put("token", data.token);

			console.log(Session);

		  $scope.user.email = '';
			$scope.user.password = '';

			$location.path( '/pipeline-list' );

			$http.defaults.headers.common['token'] = Session.token;
		});
	};
	$scope.logoutUser = function(){
		SessionOutService.create(function(data) {

		  Session.isLogged = false;
		  Session.token = "";
		  $cookieStore.remove("token");

		  console.log(Session);

		  $location.path( '/register' );

  		  $http.defaults.headers.common['token'] = "";
		});
	};
}]);
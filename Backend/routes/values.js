var pipelinr_util = require("../util/util.js");
var models = require('../models/models.js');
var moment = require('../node_modules/moment/min/moment.min.js');

exports.updateValue = function(req, res) {
  var object = req.body;
  var _pipeline_id = req.params.pipeline_id;
  var _dataset_id = req.params.dataset_id;
  //Correct the timestamp if neccessary
  var ts;
  if (object.timestamp === null || object.timestamp === undefined) {
    //No timestamp given, just take the current time of the pipelinr machine
    ts = moment().format('DD MM YYYY, HH:mm:ss:SSS');
  } else if (moment(object.timestamp, 'DD MM YYYY, HH:mm:ss:SSS').isValid()) {
    //Timestamp already has the expected database format, just use it
    ts = object.timestamp;
  } else {
    var mom = moment(object.timestamp);
    if (mom.isValid()) {
      //Timestamp has a valid ISO 8601 format, convert it to the database format
      ts = mom.format('DD MM YYYY, HH:mm:ss:SSS');
    } else {
      //Timestamp has no supported format, return an error
      res.status(400).send("Timestamp has no valid format. Specify it in ISO 8601 or use this schema: DD MM YYYY, HH:mm:ss:SSS");
    }
  }
  console.log('Update value ' + object.value + ' (TS_req='+object.timestamp+',TS_db='+ts+'): ' + _pipeline_id + " in " + _dataset_id);

  var value = new models.Value({
    _dataset: _dataset_id,
    timestamp: object.timestamp,
    value: object.value,
    level: object.level
  });

  value.save(function(err, value) {
    if (err) return res.send(pipelinr_util.handleError(err));
    res.send(200);
  });

  // Save ref in dataset
	/*models.Dataset.findOneAndUpdate({_id: _dataset_id}, {$push: {"values": value._id}}, {safe: true, upsert: false})
	.exec(function (err, dataset) {
	        if (err) return res.send(pipelinr_util.handleError(err));
          if(dataset !== null) {
            value.save(function(err, value) {
              if (err) return res.send(pipelinr_util.handleError(err));
              res.send(200);
            });
          } else {
            res.send(404);
          }
	    }
	);*/
};

exports.deleteAllValues = function(req, res) {
  var object = req.body;
  var _pipeline_id = req.params.pipeline_id;
  var _dataset_id = req.params.dataset_id;

  console.log('Delete all values from: ' + _pipeline_id + " in " + _dataset_id);

  models.Value.find({ _dataset: req.params.dataset_id }, function(err, values) {
    if (err) return res.send(pipelinr_util.handleError(err));
    for(var i = 0; i < values.length; i++) {
      values[i].remove();
    }
    res.send(200, {});
  });
};
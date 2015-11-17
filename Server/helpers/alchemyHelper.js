var db = require("./../helpers/db"),
	_ = require('lodash'),
	AlchemyAPI = require('./../javascripts/alchemyapi'),
	alchemyapi = new AlchemyAPI();

var response = {
  "status": "OK",
  "usage": "By accessing AlchemyAPI or using information generated by AlchemyAPI, you are agreeing to be bound by the AlchemyAPI Terms of Use: http://www.alchemyapi.com/company/terms.html",
  "url": "http://www.complex.com/music/2015/11/big-sean-lil-wayne-eminem-finding-paradise-live-in-detroit-concert",
  "totalTransactions": "2",
  "language": "english",
  "text": "In September, Big Sean announced a major concert called “Finding Paradise Live in Detroit” where portions of the proceeds will benefit the Sean Anderson Foundation, which assists in the education, health, safety, and well-being of Detroit school aged youth, as well as disadvantaged youth in other areas across the nation. Earlier tonight, the performance was held at the Joe Louis Arena and it was jam-packed with special guests from Jhené Aiko, Lil Wayne, Eminem and many more. The G.O.O.D. Music rapper performed some of his solo songs like \"One Man Can Change The World\" and \"My Last.\" Check out some videos and photos below.\n  — Nigel Int'l D. (@Nigel_D) November 7, 2015\n",
  "keywords": [
    {
      "relevance": "0.919752",
      "sentiment": {
        "score": "0.329037",
        "type": "positive"
      },
      "text": "new music video"
    },
    {
      "relevance": "0.82124",
      "sentiment": {
        "type": "neutral"
      },
      "text": "official recap"
    },
    {
      "relevance": "0.766893",
      "sentiment": {
        "type": "neutral"
      },
      "text": "recent performance"
    },
    {
      "relevance": "0.765395",
      "sentiment": {
        "type": "neutral"
      },
      "text": "Los Angeles"
    },
    {
      "relevance": "0.673818",
      "sentiment": {
        "score": "0.618302",
        "type": "positive"
      },
      "text": "Weezer"
    },
    {
      "relevance": "0.521278",
      "sentiment": {
        "score": "0.329037",
        "type": "positive"
      },
      "text": "Peep"
    },
    {
      "relevance": "0.507418",
      "sentiment": {
        "type": "neutral"
      },
      "text": "Situation"
    },
    {
      "relevance": "0.504255",
      "sentiment": {
        "type": "neutral"
      },
      "text": "footage"
    },
    {
      "relevance": "0.502978",
      "sentiment": {
        "type": "neutral"
      },
      "text": "Ai"
    },
    {
      "relevance": "0.494094",
      "sentiment": {
        "type": "neutral"
      },
      "text": "Perfect"
    },
    {
      "relevance": "0.463899",
      "sentiment": {
        "type": "neutral"
      },
      "text": "way"
    },
    {
      "relevance": "0.463636",
      "sentiment": {
        "type": "neutral"
      },
      "text": "web"
    },
    {
      "relevance": "0.460398",
      "sentiment": {
        "type": "neutral"
      },
      "text": "Videos"
    },
    {
      "relevance": "0.460141",
      "sentiment": {
        "type": "neutral"
      },
      "text": "songs"
    },
    {
      "relevance": "0.455326",
      "sentiment": {
        "score": "0.618302",
        "type": "positive"
      },
      "text": "eye"
    },
    {
      "relevance": "0.454316",
      "sentiment": {
        "score": "0.329037",
        "type": "positive"
      },
      "text": "God"
    }
  ],
   "entities": [],
  "taxonomy":   [
    {
      "label": "/art and entertainment/shows and events/concert",
      "score": "0.875718"
    },
    {
      "confident": "no",
      "label": "/art and entertainment/music",
      "score": "0.394208"
    },
    {
      "confident": "no",
      "label": "/art and entertainment/music/singing",
      "score": "0.344353"
    }
  ] 
}

function analyzePost(url, callback) {
	alchemyapi.combined('url', url, {
		extract: ['keyword', 'taxonomy', 'entity']
	}, function(data) {
		var keywords = data.keywords ? data.keywords : [];
		var taxonomy = data.taxonomy ? data.taxonomy : [];	
		var entities = data.entities ? data.entities : [];

		db.buckets.find({}, function(err, buckets) {
			var bestBucket, bestOverall = 0;
			_.forEach(buckets, function(bucket) {
				var keywordConfidence = compareKeywords(bucket.approvedKeywords, bucket.magicWords, keywords),
					taxonomyConfidence = compareTaxonomy(bucket.solidTaxonomy, taxonomy),
					entityConfidence = compareEntity(bucket.solidEntities, entities);

				var	overall = keywordConfidence + (taxonomyConfidence * 1.5) + entityConfidence;

							console.log(keywordConfidence, taxonomyConfidence, entityConfidence, overall)

				if(overall >= 1.5 && overall > bestOverall) {
					bestBucket = bucket;
					bestOverall = overall
				}
			});
			if(bestBucket) {
        addData(data, bestBucket);
				callback(bestBucket.tag);
      } else
				callback();
		});
	});
}

function addData(data, bucket) {
  _.forEach(data.taxonomy, function(taxonomy) {
    db.buckets.find({ 
      tag: bucket.tag, 
      "taxonomy.text": taxonomy.label
    }, function(err, res) {
      if(res.length === 0) {
        db.buckets.update({ tag: bucket.tag }, { 
          $addToSet : {
            taxonomy: {
              text: taxonomy.label,
              count: 1,
              score: parseFloat(taxonomy.score) 
            }
          }
        }, function(err, res) {
          console.log(err, res)
        });
      } else {
        db.buckets.update({ 
          tag: bucket.tag, 
          "taxonomy.text": taxonomy.label
        }, { 
          $inc: { 
            "taxonomy.$.count" : 1,
            "taxonomy.$.score" : parseFloat(taxonomy.score) 
          }
        }, function(err, res) {
          console.log(err, res)
        });
      }
    });
  });

  _.forEach(data.keywords, function(keyword) {
    db.buckets.find({ 
      tag: bucket.tag, 
      "keywords.text": keyword.text
    }, function(err, res) {
      if(res.length === 0) {
        db.buckets.update({ tag: bucket.tag }, { 
          $addToSet : {
            keywords: {
              text: keyword.text,
              count: 1,
              score: parseFloat(keyword.relevance) 
            }
          }
        }, function(err, res) {
          console.log(err, res)
        });
      } else {
        db.buckets.update({ 
          tag: bucket.tag, 
          "keywords.text": keyword.text
        }, { 
          $inc: { 
            "keywords.$.count" : 1,
            "keywords.$.score" : parseFloat(keyword.relevance) 
          }
        }, function(err, res) {
          console.log(err, res)
        });
      }
    });
  });

  _.forEach(data.entities, function(entity) {
    db.buckets.find({ 
      tag: bucket.tag, 
      "entity.text": entity.text
    }, function(err, res) {
      if(res.length === 0) {
        db.buckets.update({ tag: bucket.tag }, { 
          $addToSet : {
            entities: {
              text: entity.text,
              count: 1,
              score: parseFloat(entity.relevance) 
            }
          }
        }, function(err, res) {
          console.log(err, res)
        });
      } else {
        db.buckets.update({ 
          tag: bucket.tag, 
          "entity.text": entity.text
        }, { 
          $inc: { 
            "entity.$.count" : 1,
            "entity.$.score" : parseFloat(entity.relevance),
          }
        }, function(err, res) {
          console.log(err, res)
        });
      }
    });
  });
}

function compareKeywords(base, magicWords, found) {
	var confidence = 0;

	_.forEach(found, function(keyword) {
		if(_.includes(base, keyword.text)) {
			// console.log(keyword.text)
			confidence += parseFloat(keyword.relevance)
		} else {
			var text = keyword.text;
			_.forEach(magicWords, function(magicWord) {
				if(text.toLowerCase().indexOf(magicWord) > -1) {
					console.log(text, magicWord)
					confidence += parseFloat(keyword.relevance)
				}
			});
		}

		if(keyword.text.toLowerCase().indexOf('music video') > -1)
			confidence -= 5 //magic number, dont want music videos to be tagged
	});

	return confidence;
}

function compareTaxonomy(base, found) {
	var confidence = 0;

	_.forEach(found, function(taxonomy) {
		if(_.includes(base, taxonomy.label)) {
			if (taxonomy.confident && taxonomy.confident == 'no')
				confidence += (parseFloat(taxonomy.score) * parseFloat(taxonomy.score))
			else
				confidence += parseFloat(taxonomy.score)
		}
	});

	return confidence;
}

function compareEntity(base, found) {
	var confidence = 0;

	_.forEach(found, function(entity) {
		if(_.includes(base, entity.text)) {
			confidence += parseFloat(entity.relevance)
		}
	});

	return confidence;
}

function gatherInfo(genre) {
	db.buckets.find({tag: genre}, function(err, frame) {
		if(err)
			return console.log(err)

		var searchedPosts = frame[0].searchedPosts;
		db.videos.find({tags:genre}, function(err, videos) {
			if(!err) {
				var i = 0;
				var inter = setInterval(function() {
					if(i === videos.length)
						return clearInterval(inter);
					var video = videos[i++];
					_.forEach(video.origPosts, function(url) { // go through post found 
						if(!_.includes(searchedPosts, url)) { // exclude already visited posts
							console.log(video.title, i)
							searchedPosts = _.union(searchedPosts, url);
							analyzePost(url, function(data) {
								console.log(data)
								var keywords = data.keywords ? _.pluck(data.keywords, 'text') : [];
								var taxonomy = data.taxonomy ? _.pluck(data.taxonomy, 'label') : [];	
								var entities = data.entities ? _.pluck(data.entities, 'text') : [];	
				
								db.buckets.update({tag: genre}, {
									$push: {
										'taxonomy' : { $each : taxonomy },
										'keywords' : { $each : keywords },
										'entities' : { $each : entities }
									},
									$addToSet: {
										'searchedPosts' : url
									}
								})
							});
						} 
					});
				}, 500);
			} else {
				console.log(err)
			}
		});
	});
}

function countAlchemy(genre) {
	db.buckets.find({tag: genre}, function(err, frame) {
		console.log("========== " + genre + " ========");
		setPrint(frame[0].taxonomy, "toxonomy");
		console.log("==============================");
		setPrint(frame[0].entities, "entities");
		console.log("==============================");
    setPrint(frame[0].keywords, "keywords");
		// var subtractedKeywords = _.filter(frame[0].keywords, function(keyword) {
  //     var found = false;

  //     _.forEach(frame[0].entities, function(val,entity) {
  //       if(keyword.indexOf(entity) > -1) {
  //         found = true;
  //         return false;
  //       }
  //     });

  //     return !found;
  //   });
		// var x = setPrint(counts(subtractedKeywords), "Keywords without entities");
  //   _.forEach(x, function(val, key) {
  //     if(key.indexOf('.') > -1 || key[0] === '$') {
  //       console.log(key)
  //       delete x[key]
  //     }
  //   }) 
  //   db.buckets.update({tag:genre}, {$set : {keywords: x}}, function(err, res) {
  //     console.log(err, res)
  //   })
	});
}

function toArray(data) {
  return _.map(data, function(val, key) {
    return {
      text: key,
      count: val.count
    };
  });
}

function bySortedValue(obj, callback, context) {
    var tuples = [];

    for (var key in obj) tuples.push([key, obj[key]]);

    tuples.sort(function(a, b) { 
      return a[1].count < b[1].count ? 1 : a[1].count > b[1].count ? -1 : 0 
    });

    var length = 0;
    while (length++ != 100) callback.call(context, tuples[length][0], tuples[length][1]);
}

function setPrint(sets, name) {
	console.log("Total " + name + ": " + _.keys(sets).length);
	console.log("Total unique " + name + ": " + _.keys(sets).length);	
	console.log("Top 10 most common " + name);
	// bySortedValue(sets, function(key, value) {
	// 	console.log(key, value);
	// });
  console.log(sets.sort(function(a, b) {
    return a.count - b.count;
  }).reverse().slice(0, 100))
}	

function counts(sets) {
  var dictionary = {};
  var nodupes = _.uniq(sets, false);
  _.forEach(sets, function(index) {
    if(dictionary[index] === undefined) dictionary[index] = { count : 0 };
    dictionary[index].count++;
  });
  return dictionary;
}

function objectize(sets) {
  var dictionary = _.object(_.map(sets, function(val, key) {
    return [key, {
      count: val
    }]
  }));
  return dictionary;
}

module.exports = analyzePost;

analyzePost('http://www.stereogum.com/1843598/watch-pearl-jam-debut-comfortably-numb-cover-in-the-rain-in-brazil/video/', function(tag) {
	console.log(tag)
})
// countAlchemy("Live")
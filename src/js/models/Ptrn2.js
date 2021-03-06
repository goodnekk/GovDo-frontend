var ptrn = (function(){

	//storage, is responsible for quickly storing and retreiving data
	var storage = (function(){

		var age = 0;
		var pub = {};

		var transactions = [];
		var speculativetransactions = [];

		var atoms = [];
		var atomCount = 0;
		var relations = [];
		var relationCount = 0;

		var typemap = {};
		var relationmap = {};

		pub.setage = function(a){
			if(a>age){age=a;}
		};

		pub.getage = function(){
			return age;
		};

		pub.transact = function(callback){
			var atom = {
				tid: transactions.length,
				time: new Date()
			};

			pub.setage(atom.tid);
			atom.node = callback(atom.tid);
			atom.value = atom.node.value[0];
			transactions.push(atom);
			return atom;
		};

		pub.speculativetransact = function(callback){
			var atom = {
				tid: (transactions.length+speculativetransactions.length+100001),
				time: new Date()
			};

			atom.node = callback(atom.tid);
			atom.value = atom.node.value[0];
			speculativetransactions.push(atom);
			return atom;
		};

		pub.reifyspeculativetransactions = function(updates){
			//update transactions
			speculativetransactions.map(function(transaction, count){
				transaction.node.value = transaction.node.value.map(function(v){
					if(v.tid===transaction.tid){
						v.tid = updates.newtransactions[count].tid;
					}
					return v;
				});
				transaction.tid = updates.newtransactions[count].tid;
				transaction.time = updates.newtransactions[count].time;
				pub.setage(transaction.tid);
				transactions[transaction.tid] = transaction;
			});
			speculativetransactions = [];

			for(var i in updates.speculativeids){
				var oldid = parseInt(i);
				var newid = updates.speculativeids[i];

				//update all aid in atoms


				atoms[newid] = atoms[oldid];
				atoms[newid].aid = newid;
				delete atoms[oldid];

				//relationmap
				if(relationmap[oldid]){
					var holdmap = JSON.parse(JSON.stringify(relationmap[oldid]));
					delete relationmap[oldid];
					relationmap[newid] = holdmap;
					relationmap[newid].map(function(other){
						relationmap[other] = relationmap[other].map(function(self){
							if(self===oldid){return newid;}
							return self;
						});
					});
				}
			}
			//update rels
			relations = relations.map(function(rel){
				if(rel.aid>100000){rel.aid = updates.speculativeids[rel.aid];}
				if(rel.bid>100000){rel.bid = updates.speculativeids[rel.bid];}
				return rel;
			});
		};

		pub.clearspeculativetransactions = function(){
			speculativetransactions = [];
		};

		pub.writeatom = function(aid, tid, type, value){
			if(!atoms[aid]) {
				atoms[aid] = {
					aid: aid,
					type: type,
					value: [{
						tid: tid,
						value: value
					}]
				};
				pub.maptypeatom(type, atoms[aid]);
			} else {
				atoms[aid].value.push({
					tid: tid,
					value: value
				});
				atoms[aid].value.sort(function(a,b){
					return Math.abs(b.tid)-Math.abs(a.tid);
				});
			}
			return atoms[aid];
		};

		pub.unupdateatom = function(aid, tid){
			atoms[aid].value = atoms[aid].value.filter(function(v){
				return v.tid !== tid;
			});
			atoms[aid].value.sort(function(a,b){
				return Math.abs(b.tid)-Math.abs(a.tid);
			});
		};

		pub.overwriteatom = function(aid, value){
			if(atoms[aid]) {
				atoms[aid].value[0].value = value;
			}
			return atoms[aid];
		};

		pub.createatom = function(tid, type, value){
			var aid = atomCount++;
			if(tid>100000){
				aid = (aid+100001);
			}
			return pub.writeatom(aid, tid, type, value);
		};

		pub.uncreateatom = function(tid, type, value){
			var aid = atomCount--;
			delete atoms[aid];
		};

		pub.dropatom = function(aid, tid){
			atoms[aid].value.push({
				tid: tid,
				drop: true
			});
			atoms[aid].value.sort(function(a,b){
				return Math.abs(b.tid)-Math.abs(a.tid);
			});
			pub.unmaptypeatom(atoms[aid].type, atoms[aid]);
			return atoms[aid];
		};

		pub.writerelation = function(tid, aid, bid, value){
			//if relation exists use that
			var found = relations.find(function(rel){
				return ((rel.aid===aid && rel.bid===bid) || (rel.aid===bid && rel.bid===aid));
			});
			if(found){
				rid = found.rid;
			} else {
				rid = relationCount++;
			}

			if(!relations[rid]) {
				relations[rid] = {
					rid: rid,
					aid: aid,
					bid: bid,
					value: [{
						tid: tid,
						value: value
					}]
				};
			} else {
				relations[rid].value.push({
					tid: tid,
					value: value
				});
				relations[rid].value.sort(function(a,b){
					return Math.abs(b.tid)-Math.abs(a.tid);
				});
			}

			if(value){
				pub.maprelation(aid, bid);
			} else {
				pub.unmaprelation(aid, bid);
			}
			return relations[rid];
		};

		//maps
		pub.maptypeatom = function(type, atom){
			if(!typemap[type]){
				typemap[type] = [];
			}
			typemap[type].push(atom);
		};

		pub.unmaptypeatom = function(type, atom){
			if(typemap[type]){
				typemap[type] = typemap[type].filter(function(other){
					return (other.aid !== atom.aid);
				});
			}
		};

		pub.maprelation = function(aid, bid){
			if(!relationmap[aid]){relationmap[aid] = [];}
			if(!relationmap[aid].find(function(other){
				return other === bid;
			})){
				relationmap[aid].push(bid);
			}

			if(!relationmap[bid]){relationmap[bid] = [];}
			if(!relationmap[bid].find(function(other){
				return other === aid;
			})){
				relationmap[bid].push(aid);
			}
		};

		pub.unmaprelation = function(aid, bid){
			if(!relationmap[aid]){relationmap[aid] = [];}
			relationmap[aid] = relationmap[aid].filter(function(other){
				return other !== bid;
			});

			if(!relationmap[bid]){relationmap[bid] = [];}
			relationmap[bid] = relationmap[bid].filter(function(other){
				return other !== aid;
			});
		};

		//read
		pub.getspeculativetransactions = function(){
			return speculativetransactions;
		};

		pub.gettransactions = function(){
			return transactions;
		};

		pub.getatoms = function(){
			return atoms;
		};

		pub.getrelations = function(){
			return relationmap;
		};

		pub.getatom = function(aid){
			if(atoms[aid] && !atoms[aid].value[0].drop){
				return atoms[aid];
			} else {
				return undefined;
			}
		};

		/*
		pub.getatomsbytype = function(type){
			return typemap[type];
		};

		pub.getrelations = function(aid){
			return relationmap[aid].map(function(bid){
				return pub.getatom(bid);
			}).filter(function(b){
				return b !== undefined;
			});
		};

		pub.getrelationsbytype = function(aid, type){
			return pub.getrelations(aid).filter(function(b){
				return b.type === type;
			});
		};
		*/

		pub.log = function(){
			console.log(speculativetransactions);
			console.log(atoms);
			console.log(relations);
		};

		return pub;
	})();

	//transactor, responsible for writing new data
	var transactor = (function(){
		var pub = {};

		pub.createatom = function(type, value){
			if(type !== undefined && value !== undefined){
				return storage.transact(function(tid){
					return storage.createatom(tid, type, value);
				});
			}
		};

		pub.updateatom = function(aid, value){
			if(aid !== undefined && value !== undefined){
				return storage.transact(function(tid){
					return storage.writeatom(aid, tid, "", value);
				});
			}
		};

		pub.relate = function(aid, bid, value){
			if(aid !== undefined && bid !== undefined && value !== undefined){
				return storage.transact(function(tid){
					return storage.writerelation(tid, aid, bid, value);
				});
			}

		};

		pub.dropatom = function(aid){
			if(aid !== undefined){
				return storage.transact(function(tid){
					return storage.dropatom(aid, tid);
				});
			}
		};

		pub.sync = function(newtransactions){
			var transactions = storage.gettransactions();
			newtransactions = newtransactions.filter(function(t, count){
				return transactions.find(function(o){
					return (o.tid === count);
				}) === undefined;
			});

			//console.log("newtransactions", transactions, newtransactions);
			pub.consume(newtransactions);
		};

		pub.consume = function(transactions){
			var speculativeids = {};
			var newtransactions = transactions.map(function(t){
				var newtransaction;
				if(t.transaction === "create") {
					newtransaction = pub.createatom(t.type, t.value);
					speculativeids[t.aid] = newtransaction.node.aid;
					return newtransaction;
				} else if(t.transaction === "update") {
					if(t.aid > 100000) {t.aid = speculativeids[t.aid];}
					return pub.updateatom(t.aid, t.value);
				} else if(t.transaction === "drop") {
					if(t.aid > 100000) {t.aid = speculativeids[t.aid];}
					return pub.dropatom(t.aid);
				} else if(t.transaction === "relate") {
					if(t.aid > 100000) {t.aid = speculativeids[t.aid];}
					if(t.bid > 100000) {t.bid = speculativeids[t.bid];}
					return pub.relate(t.aid, t.bid, t.value);
				}
			});
			return {
				speculativeids: speculativeids,
				newtransactions: newtransactions
			};
		};

		pub.publish = function(){
			return storage.gettransactions().map(function(t){
				if(t.node.rid !== undefined){
					return {
						transaction: "relate",
						value: t.value.value,
						aid: t.node.aid,
						bid: t.node.bid
					};
				} else {
					if(t.node.value[t.node.value.length-1].tid === t.value.tid){
						return {
							transaction: "create",
							value: t.value.value,
							type: t.node.type,
							aid: t.node.aid
						};
					} else {
						if(t.value.drop){
							return {
								transaction: "drop",
								aid: t.node.aid,
							};
						} else {
							return {
								transaction: "update",
								aid: t.node.aid,
								value: t.value.value,
							};
						}
					}
				}
			});
		};

		return pub;
	})();


	//speculator responsible for writing temporary changes
	var speculator = (function(){
		var pub = {};

		pub.createatom = function(type, value){
			return storage.speculativetransact(function(tid){
				return storage.createatom(tid, type, value);
			});
		};

		pub.updateatom = function(aid, value){
			if(storage.getatom(aid).value[0].tid>100000){
				return storage.overwriteatom(aid, value);
			} else {
				storage.speculativetransact(function(tid){
					return storage.writeatom(aid, tid, "", value);
				});
			}
		};

		pub.relate = function(aid, bid, value){
			return storage.speculativetransact(function(tid){
				return storage.writerelation(tid, aid, bid, value);
			});
		};

		pub.dropatom = function(aid){
			return storage.speculativetransact(function(tid){
				return storage.dropatom(aid, tid);
			});
		};

		pub.reify = function(updates){
			return storage.reifyspeculativetransactions(updates);
		};

		pub.publish = function(callback){
			network.publish(storage.getspeculativetransactions().map(function(t){
				if(t.node.rid !== undefined){
					return {
						transaction: "relate",
						value: t.value.value,
						aid: t.node.aid,
						bid: t.node.bid
					};
				} else {
					if(t.node.value[t.node.value.length-1].tid === t.value.tid){
						return {
							transaction: "create",
							value: t.value.value,
							type: t.node.type,
							aid: t.node.aid
						};
					} else {
						if(t.value.drop){
							return {
								transaction: "drop",
								aid: t.node.aid,
							};
						} else {
							return {
								transaction: "update",
								aid: t.node.aid,
								value: t.value.value,
							};
						}
					}
				}
			}), callback);
		};

		pub.clear = function(callback){
			//rollback
			console.log(storage.getspeculativetransactions());
			storage.getspeculativetransactions().reverse().map(function(t){
				if(t.node.rid !== undefined){
					//if it's a relation
					storage.writerelation(t.tid, t.node.aid, t.node.bid, !t.value.value);
				} else {
					//if it's a creation
					if(t.node.value[t.node.value.length-1].tid === t.value.tid){
						storage.uncreateatom(t.tid);
					} else {
						if(t.value.drop){
							//if it's a drop
							storage.unupdateatom(t.node.aid, t.tid);
						} else {
							//if it's an update
							storage.unupdateatom(t.node.aid, t.tid);
						}
					}
				}
			});
			storage.clearspeculativetransactions();
		};

		pub.hasspeculations = function(){
			return (storage.getspeculativetransactions().length > 0);
		};

		return pub;
	})();

	//responsible for transforming individual atoms to public api
	var atomfactory = (function(){
		var pub = {};

		pub.produce = function(atom){
			var a = function(q, callback){
				var subset = selector.getatomrelations(atom);
				return query(q, callback, subset);
			};

			a.value = function(){
				return atom.value[0].value;
			};
			a.type = function(){return atom.type;};

			a.id = function(){return atom.aid;};

			a.update = function(input){
				speculator.updateatom(atom.aid, input);
			};

			a.drop = function(){
				speculator.dropatom(atom.aid);
			};

			return a;
		};

		return pub;
	})();

	//selector, responsible for getting data from storage and transforming to public api
	var selector = (function(){
		var pub = {};

		function set(sub){
			if(sub){
				return sub;
			} else {
				return storage.getatoms().filter(function(atom){
					return (!atom.value[0].drop);
				});
			}
		}

		pub.getatoms = function(){
			return set();
		};

		pub.getatombyid = function(id, sub){
			var s = set(sub);
			var found = s.filter(function(atom){
				return atom.aid === id;
			});
			//if(found) {
			//	return [s[id]];
			//}
			return found;
		};

		pub.getatomsbytype = function(type, sub){
			var s = set(sub);
			return s.filter(function(atom){
				return atom.type===type;
			});
		};

		pub.getatomsbytypevalue = function(type, value, sub){
			var s = set(sub);
			return s.filter(function(atom){
				return (atom.type===type && (atom.value[0].value===value || atom.value[0].value===parseInt(value)));
			});

		};

		pub.getatomrelations = function(atom){
			if(storage.getrelations()[atom.aid]){
				return storage.getrelations()[atom.aid].map(function(rid){
					return storage.getatoms()[rid];
				}).filter(function(atom){
					return (!atom.value[0].drop);
				});
			}
			return [];
		};

		pub.getsubsetrelations = function(subset){

			var relations = subset.map(function(atom){
				return pub.getatomrelations(atom);
			}).reduce(function(a,b){
				return a.concat(b);
			},[]);

			//remove doubles
			return relations.filter(function(item, pos) {
				return (item && relations.indexOf(item) == pos);
			});
		};

		pub.search = function(searchterm){
			var s = set();
			return s.filter(function(atom){
				return (String(atom.value[0].value).toLowerCase().indexOf(searchterm.toLowerCase())>-1);
			});
		};

		return pub;
	})();

	//query
	var query = (function(){
		var q = function(input, callback, subset){
			var words = input.split(/ (.+)/);
			var first = words[0];

			var selection = [];

			if(first.length === 0) {
				selection = selector.getatoms();
			} else if(first.charAt(0)==="#") {
				var id = parseInt(first.substring(1));
				selection = selector.getatombyid(id, subset);
			} else if(first.charAt(0)==="*") {
				var search = input.substring(1);
				selection = selector.search(search);
			} else {
				var typevalue = first.split(":");
				var type = typevalue[0];
				if(typevalue.length===1){
					selection = selector.getatomsbytype(type, subset);
				} else {
					var value = typevalue[1];
					selection = selector.getatomsbytypevalue(type, value, subset);
				}
			}

			if(words.length===1 || first.charAt(0)==="*"){
			//if its not a long query
				if(callback){
					return selection.map(function(atom){
						return callback(atomfactory.produce(atom));
					});
				} else {
					if(selection.length > 0) {
						return atomfactory.produce(selection[0]);
					}
					return atomfactory.produce({
						aid: -1,
						type: "",
						value: [{
							tid  : -1,
							value: ""
						}]
					});
				}
			} else {
				var relations = selector.getsubsetrelations(selection);
				return query(words[1], callback, relations);
			}
		};

		q.consume = transactor.consume;
		q.dump = transactor.publish;

		/*PUBLIC INTERFACE*/
		q.transact = speculator.publish;
		q.getage = storage.getage;
		//q.find = find;
		//q.compare = compare;
		q.log = storage.log;

		q.create = function(type, value, callback){
			var result = atomfactory.produce(speculator.createatom(type, value).node);
			if(callback){callback(result);}
			return result;
		};

		//q.findorcreate
		q.relate = function(a, b, callback){
			speculator.relate(a.id(), b.id(), true);
			if(callback){callback();}
			return;
		};

		q.unrelate = function(a, b, callback){
			speculator.relate(a.id(), b.id(), false);
			if(callback){callback();}
			return;
		};

		q.createrelate = function(type, value, b, callback){
			var a = q.create(type, value);
			q.relate(a,b);
			if(callback){callback(a);}
			return a;
		};
		q.speculativeRelate = q.relate;
		q.speculativeUnrelate = q.unrelate;
		q.unSpeculate = speculator.clear;
		q.hasSpeculations = speculator.hasspeculations;

		q.compare = function(a,b){
			return (a && b && a.id()===b.id());
		};

		return q;
	})();

	//network, responsible for syncing with the backend
	var network = (function(){
		var pub = {};
		var callbacks = {
			onpublish: []
		};

		pub.publish = function(value, callback){
			callbacks.onpublish.map(function(c){
				c(value, callback);
			});
		};

		pub.onpublish = function(callback){
			callbacks.onpublish.push(callback);
		};

		return pub;
	})();

	network.onpublish(function(transaction, callback){
		m.request({
			method: "POST",
			url: config.api_endpoint+"/transact",
			data: transaction
		})
		.then(function(result) {
			speculator.reify(result);
			if(callback){callback();}
		});
	});

	query.onload = function(callback){
		m.request({
			method: "GET",
			url: config.api_endpoint+"/dump",
		})
		.then(function(result) {
			transactor.consume(result);
			query.sync();
			callback();
		});
	};

	query.sync = function(){
		m.request({
			method: "GET",
			url: config.api_endpoint+"/",
		})
		.then(function(result) {

			if(result.transactions > storage.getage()){
				m.request({
					method: "GET",
					url: config.api_endpoint+"/dump",
				})
				.then(function(result) {
					transactor.sync(result);
					m.redraw();
					window.setTimeout(query.sync, 5000);
				});
			} else {
				window.setTimeout(query.sync, 2000);
			}
		});
	};



	query.adduser = function(userid, callback){
		m.request({
			method:"POST",
			url: config.api_endpoint+"user/add",
			data: {
				id: userid
			}
		}).then(function(resp){
			if(callback) callback(resp);
		});
	};

	query.dropuser = function(userid, callback){
		m.request({
			method:"POST",
			url: config.api_endpoint+"user/drop",
			data: {
				id: userid
			}
		}).then(function(resp){
			if(callback) callback(resp);
		});
	};

	query.updateuser = function(userid, name, role, callback){
		m.request({
			method:"POST",
			url: config.api_endpoint+"user/set",
			data: {
				id: userid,
				name: name,
				role: role,
			}
		}).then(function(resp){
			if(callback) callback(resp);
		});
	};

	query.loginuser = function(user, callback){
		m.request({
			method:"POST",
			url: config.api_endpoint+"user/hash",
			data: {
				name: user
			}
		}).then( function(resp){
			callback(resp.succes);
		});
	};

	query.loginpass = function(user, pass, callback){
		m.request({
			method:"POST",
			url: config.api_endpoint+"user/check",
			data: {
				name: user,
				pass: pass
			}
		}).then( function(resp){
			callback(resp.succes, resp.node, resp.role);
		});
	};

	query.getusers = function(callback){
		m.request({
			method:"GET",
			url: config.api_endpoint+"users",
			data: {},
		}).then( function(resp){
			userlist = resp;
			callback(resp);
		});
	};

//	speculator.createatom("cheese", "red");
//	speculator.createatom("cheese", "purple");
//	speculator.updateatom(-1, "blue");
//	speculator.relate(-0,-1, true);
//
//	speculator.publish();



	return query;
})();

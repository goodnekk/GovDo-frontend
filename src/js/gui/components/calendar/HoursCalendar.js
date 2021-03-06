var HoursCalendar = function(){
	//var opentime, closetime;
	var p = {
		w:100, h:100,
		scale: 1,
		margin: 2,
		opentime: 0,
		closetime: 0,
		gridheight: 40,
	};

	function setCurrentDate(date, scale){
		p.opentime =  FuzzyDate.getMonday(date);
		p.scale = scale;
		if(scale===1){
			p.closetime =  FuzzyDate.nextKwarter(p.opentime);
		} else {
			p.closetime =  FuzzyDate.nextYear(p.opentime);
		}

	}

	function resize(dom){
		var rect = dom.getBoundingClientRect();
		p.w = rect.width;
		p.h = rect.height;
		p.margin = rect.width*0.02;
		console.log(p);
		m.redraw();
	}

	function refocus(){
		if(vm.focus().type()==="person"){
			p.gridheight = vm.focus()("plannable").value();
		}
		if(vm.focus().type()==="program"){
			p.gridheight = vm.focus()("task effort person plannable", function(c){return parseInt(c.value());}).reduce(function(o,c){return o+c;},0);
		}
		if(vm.focus().type()==="task"){
			p.gridheight = vm.focus()("effort hours", function(h){return parseInt(HoursSpent.Parse(h.value()).hours);}).reduce(function(o,c){return o+c;},0);
			//p.gridheight = vm.focus()("effort person plannable", function(c){return parseInt(c.value());}).reduce(function(o,c){return o+c;},0);
		}
		if(vm.focus().type()==="effort"){

			p.gridheight = vm.focus()("hours", function(h){return parseInt(HoursSpent.Parse(h.value()).hours);}).reduce(function(o,c){return o+c;},0);
			//p.gridheight = vm.focus()("person plannable", function(c){return parseInt(c.value());}).reduce(function(o,c){return o+c;},0);
		}
	}

	function setDate(vnode, updown){
		if(p.scale===1){
			if(updown){
				vnode.attrs.setDate(FuzzyDate.nextWeek(p.opentime));
			} else {
				vnode.attrs.setDate(FuzzyDate.prevWeek(p.opentime));
			}
		} else {
			if(updown){
				vnode.attrs.setDate(FuzzyDate.nextMonth(p.opentime));
			} else {
				vnode.attrs.setDate(FuzzyDate.prevMonth(p.opentime));
			}
		}

	}

	return {
		view: function(vnode){
			refocus();
			setCurrentDate(vnode.attrs.currentDate, vnode.attrs.currentScale);
			return m(".calendar",[
				m(".calendar-hours-range", p.gridheight),
				m("svg",{
					oncreate: function(vnode) {
						resize(vnode.dom);
						window.addEventListener("resize", function(){
							resize(vnode.dom);
						});
					},
					onmousewheel: function(e){
						setDate(vnode, e.wheelDelta >= 0);
					},
					onDOMMouseScroll: function(e){
						setDate(vnode, e.detail >= 0);
					}
				},(p.gridheight > 0) ? [

					m(CalendarGrid, {p: p}),
					m(CalendarHours, {p: p}),
					m(CalendarThisWeekLine, {p: p}),

				]:[]),
				m(CalendarLabels, {
					p: p,
					ondrag: function(dx){
						setDate(vnode, dx>0);
					}
				})
			]);
		}
	};
};

var CalendarHours = function(){
	return {
		view: function(vnode){
			//starting date
			var monday =  vnode.attrs.p.opentime;

			//get all the hours
			var hours;
			if(vm.focus().type()==="person"){
				hours = vm.focus()("hours", function(hourstring){
					return {
						effort: hourstring("effort"),
						startdate: hourstring("effort")("startdate").value(),
						enddate: hourstring("effort")("enddate").value(),
						hours: [HoursSpent.Parse(hourstring.value())]
					};
				}).reduce(function(reduced, hour){
					var found = reduced.find(function(other){
						return ptrn.compare(other.effort, hour.effort);
					});

					if(found){
						found.hours = found.hours.concat(hour.hours);
					} else {
						reduced.push(hour);
					}
					return reduced;
				},[]);
			} else if(vm.focus().type()==="effort"){
				hours = vm.focus()("hours", function(hourstring){
					return {
						effort: hourstring("person"),
						startdate: hourstring("effort")("startdate").value(),
						enddate: hourstring("effort")("enddate").value(),
						hours: [HoursSpent.Parse(hourstring.value())]
					};
				}).reduce(function(reduced, hour){
					var found = reduced.find(function(other){
						return ptrn.compare(other.effort, hour.effort);
					});

					if(found){
						found.hours = found.hours.concat(hour.hours);
					} else {
						reduced.push(hour);
					}
					return reduced;
				},[]);
			} else if(vm.focus().type()==="program") {
				hours = vm.focus()("task effort", function(effort){
					return {
						effort: effort,
						startdate: effort("startdate").value(),
						enddate: effort("enddate").value(),
						hours: effort("hours", function(hourstring){
							return HoursSpent.Parse(hourstring.value());
						})
					};
				});
			}


			//margin and width
			var mrg = vnode.attrs.p.margin;
			var w = (vnode.attrs.p.w-mrg*2)/12;

			//get all the hours per week
			return ArrayFromRange(0, 11).map(function(week){
				var startWeek = monday;
				var offset = 0;
				var totalhours = 0;
				var count = -1;

				var blocks = hours.map(function(effort){
					if(effort.hours.length>0) {count++;}
					return effort.hours.map(function(hour){
						if(FuzzyDate.inRange(effort.startdate, effort.enddate, startWeek)){
							hour.hours = parseInt(hour.hours);
							totalhours += hour.hours;

							var h = hour.hours*(vnode.attrs.p.h/vnode.attrs.p.gridheight);
							offset+=h;

							return m("rect.calendar-block", {
								class: "color-"+(count%4) + " " + ((ptrn.compare(vm.hover(), effort.effort)) ? "state-selected":""),
								x: week*w+mrg+0.5, y:vnode.attrs.p.h-offset, width: w+0.5, height: h,
								onmouseover: function(){
									vm.hover(effort.effort);
									m.redraw();
								},
								onmouseout: vm.unhover
							});
						} else {
							return [];
						}
					});
				});

				if(totalhours > vnode.attrs.p.gridheight) {
					blocks.push(m("rect.calendar-block-overshoot", {x: week*w+mrg+0.5, y:0, width: w+0.5, height: vnode.attrs.p.h/80}));
				}

				//update to next week
				if(vnode.attrs.p.scale===1){
					monday = FuzzyDate.nextWeek(monday);
				} else {
					monday = FuzzyDate.nextMonth(monday);
				}

				return blocks;
			});
		}
	};
};

var CalendarGrid = function(){
	return {
		view: function(vnode){
			var grid = [];
			//var gridheight = vm.person()("contract").value();
			var mrg = vnode.attrs.p.margin;
			var w = (vnode.attrs.p.w-mrg*2)/12;
			var h = vnode.attrs.p.h/vnode.attrs.p.gridheight;
			for(var i=0; i<12; i++){
				for(var j=0; j<vnode.attrs.p.gridheight; j++){
					grid.push(m("rect.calendar-grid", {x:i*w+1+mrg, y:j*h+1, width:w-1, height: h-1}));
				}
			}

			return grid;
		}
	};
};

var CalendarThisWeekLine = function(){
	return {
		view: function(vnode){
			var h = vnode.attrs.p.h;
			var mrg = vnode.attrs.p.margin;
			var w = (vnode.attrs.p.w-mrg*2)/12;
			var x = mapDatePosition(vnode.attrs.p, FuzzyDate.getMonday(new Date()));



			return m("rect.calendar-todayline", {
				x:x, y:0,
				width:w+1, height: h
			});

		}
	};
};

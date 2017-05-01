var PeopleList = function(){
	var state = false;

	return {
		view: function(vnode){
			return m(".people", [
				vnode.attrs.effort.people.map(function(p){
					return m("span.person",model.group.People[p].name);
				}),
				(function(){
					if(!state){
						return m("span.person", {
							onclick: function(){state=true;}
						},"+");
					} else {
						return m("select", {
							onchange: function(event){
								state=false;

								addEffortPerson(vnode.attrs.taskId, vnode.attrs.effortId, parseInt(event.target.value)-1);
							}
						}, [
							m("option", {disabled: true, selected: true}, "kies persoon..."),
							model.group.People.map(function(person){
								console.log(count);
								return m("option", {value: id}, person.name);
							})
						]);
					}
				}())

			]);
		}
	};
};

var Effort = function(){
	return {
		view: function(vnode){
			return m(".effort", [
				m("div",[
					m("img.icon", {src: "triangle.png"}),
					m("span.title", vnode.attrs.effort.title)
				]),
				m(PeopleList, {effort: vnode.attrs.effort, effortId: vnode.attrs.effortId, taskId: vnode.attrs.taskId})
			]);
		}
	};
};

var NewEffort = function(){
	var state = false;
	var value = "";
	return {
		view: function(vnode){
			if(!state) {
				return m(".effort.add", {onclick: function(){state = true;}}, "+ inspanning toevoegen...");
			} else {
				return m(".effort", [

					m("form", {
						onsubmit: function(e) {
							e.preventDefault();
							console.log(vnode.attrs.id);
							addEffort(vnode.attrs.id, value);
							state = false;
							value = "";
						}
					}, [
						m("img.icon", {src: "triangle.png"}),
						m("input.input[type=text][placeholder=Nieuwe Inspanning][autofocus=true]", {
							oninput: m.withAttr("value", function(v) {value = v;}),
							value: value
						}),
						m("button.button[type=submit]", "Save")
					])
				]);
			}

		}
	};

};

var Task = function(){
	return {
		view: function(ctrl){
			return m(".page",[
				model.group.Tasks.map(function(task, tcount){
					return m(".task",[
						//m("span.number", task.id),

						m(".title",[
							m("img.icon", {src: "cloud.png"}),
							m("span", task.name)
						]),
						//task.efforts.map(function(effort, ecount){
						//	return m(Effort, {effort: effort, taskId: tcount, effortId: ecount});
						//}),
						m(NewEffort, {id: tcount})
					]);
				}),
				m(NewTask)
			]);
		}
	};
};

var NewTask = function(){
	var state = false;
	var value = "";
	return {
		view: function(vnode){
			if(!state) {
				return m(".task.add", {onclick: function(){state = true;}}, "+ opgave toevoegen...");
			} else {
				return m(".task", [
					m("form", {
						onsubmit: function(e) {
							e.preventDefault();
							addTask(value);
							state = false;
							value = "";
						}
					}, [
						m("img.icon", {src: "cloud.png"}),
						m("input.input[type=text][placeholder=Nieuwe Opgave][autofocus=true]", {
							oninput: m.withAttr("value", function(v) {value = v;}),
							value: value
						}),
						m("button.button[type=submit]", "Save")
					])
				]);
			}

		}
	};
};

getGroup().then(function(){
	setTimeout(function(){
		m.mount(document.body, Page);
	},500);
});
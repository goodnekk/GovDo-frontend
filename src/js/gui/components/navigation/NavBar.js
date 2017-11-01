var NavBar = function(){

	var dropdownstate = false;

	return {
		view: function(vnode){
			return m("nav",[

				m(".programnav",[



					m(".nav-button", {
						onclick: function(){
							vm.page(2);
						},
					}, [
						m(Icon, {
							name: "general",
							selected: vm.page()===2
						}),
						m(".nav-tooltip", "Dashboard")
					]),

					m(".nav-button", {
						onclick: function(){
							vm.page(0);
						}
					}, [
						m(Icon, {
							name: "programma",
							selected: vm.page()===0
						}),
						m(".nav-tooltip", "Doelenboom")
					]),

					m(".nav-button", {
						onclick: function(){
							vm.page(1);
						}
					}, [
						m(Icon, {
							name: "kalendar",
							selected: vm.page()===1
						}),
						m(".nav-tooltip", "Kalender")
					]),

					m(".nav-current-position", {
						onclick: function(){
							dropdownstate = !dropdownstate;
						}
					},[
						(vm.page()=== 0 && vm.program()) ? [
							m(".nav-program-number", m(Numbering, {node: vm.program(), selected: true})),
							m(".nav-program-title-top", vm.program().value())
						] : [],
						(vm.page()=== 1 && vm.person()) ? [
							//m(".nav-button", m(Icon, {name: "meeting-2"})),
							m(".nav-program-title-top", vm.person().value())
						] : [],
					]),
					m("i.material-icons.programnav-dropdown", dropdownstate ? "arrow_drop_up" : "arrow_drop_down"),
				]),

				m(DropdownNav, {
					state: dropdownstate,
					onpick: function(){
						dropdownstate = false;
					}
				}),



				m(".nav-right", [
					m(".nav-connecting", vm.connecting() ? [
						m("span", "laden "),
						m(".smallloading", "")
					] : []),

					//User Icon
					m(".nav-user", [
						(vm.login()===0) ? [
							m(".nav-user-login", {
								onclick: function(){
									vm.page(4);
								}
							}, m(Icon, {name: "personal", selected: true} )) //ptrn("#"+vm.user().node).value()
						] : [
							m(".nav-user-login", {
								onclick: function(){
									vm.login(1);
								}
							}, m(Icon, {name: "personal"})),
						]
					])
				])
				//m(SearchBar)
			]);
		}
	};
};

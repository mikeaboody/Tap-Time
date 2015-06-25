var submit = function() {
	var submitObj_list = [];
	for (id in tr_map) {
		var currSubmitObj = createSubmitObj(tr_map[id]);
		if (currSubmitObj == null) {
			swal("One or more of your projects has 5 minutes or less recorded!", "Make sure you only enter projects with 5 minutes or more of time.", "error");
			return;
		}
		submitObj_list.push(currSubmitObj);
	}
	var confirmSubmit = function() {
		postSubmitObjs(submitObj_list, function() {
			swal({
				title: "You have submitted your hours!",
				type: "success",
			}, function() {
				reset();
			});
			
		});
	}

	
	var table_html = "<table id='submit_table'class='table table-bordered table-striped'>";
	
	table_html += "<thead><tr><th>Projects</th><th>Hours</th></tr></thead>";
	table_html += "<tbody>";

	for (id in tr_map) {
		var tr = tr_map[id];
		var proj_name = tr.$getJQuery().find($(".projects select option:selected")).text();
		var hours = "" + ((tr.$getJQuery().find($('input[name="hours"]')).val() == "") ? 0 : parseInt(tr.$getJQuery().find($('input[name="hours"]')).val(), 10));
		var minutes = ((tr.$getJQuery().find($('input[name="minutes"]')).val() == "") ? 0 : parseInt(tr.$getJQuery().find($('input[name="minutes"]')).val(), 10));
		minutes = ((minutes < 10) ? ("0" + minutes) : ("" + minutes));
		var current_tr = "<tr><td>" + proj_name + "</td><td>" + hours + ":" + minutes + "</td></tr>";
		table_html += current_tr;
	}
	table_html += "</tbody></table>";
	swal({   
		title: "Do you want to submit?",   
		text: table_html,
		html: true,    
		showCancelButton: true,   
		confirmButtonColor: "#DD6B55",   
		confirmButtonText: "Submit",   
		cancelButtonText: "Cancel",   
		closeOnConfirm: true,   
		closeOnCancel: true }, 
		confirmSubmit
	);
}

var createSubmitObj = function(tr) {
	var submitObj = new Submittable();
	var $current_tr = tr.$getJQuery();
	var minutes = ($current_tr.find('input[name="minutes"]').val() == "") ? 0 : parseInt($current_tr.find('input[name="minutes"]').val(), 10);
	var hours = ($current_tr.find('input[name="hours"]').val() == "") ? 0 : parseInt($current_tr.find('input[name="hours"]').val(), 10);
	var post_hours = hours;
	if (minutes % 15 < 6) {
		post_hours += Math.floor(minutes / 15) / 4;
	} else {
		post_hours += Math.ceil(minutes / 15) / 4;
	}
	submitObj.email = Submittable.user.email;
	submitObj.first_name = Submittable.user.first_name;
	submitObj.last_name = Submittable.user.last_name;
	submitObj.project_id = $current_tr.find(".projects select option:selected").val();
	submitObj.task_id = $current_tr.find(".tasks select option:selected").val();
	submitObj.task_type = $current_tr.find(".payment select option:selected").val();
	submitObj.hours = post_hours;
	submitObj.date = (new Date()).getTime();
	submitObj.notes = $current_tr.find(".notes textarea").val();
	if (submitObj.hours > 0) {
		return submitObj;
	} else {
		return null;
	}
}

var postSubmitObjs = function(postObjs, success) {
	var i = 0;
	var next = function() {
		if (i < postObjs.length) {
			var postObj = postObjs[i];
			i += 1;
			COMMUNICATOR.postToDatabase(postObj, function() {
				delete postObj["first_name"];
				delete postObj["last_name"];
				if (postObj["notes"] == "") {
					delete postObj["notes"];
				}
				COMMUNICATOR.postToOpenAir(postObj, next, function() {
					console.log(postObj);
					console.log("failure");
				});
			});
		} else {
			success();
		}
	}
	next();
}

var reset = function() {
	$(".content").hide(1);
	$(".welcome").html("Loading...<span class='glyphicon glyphicon-refresh glyphicon-refresh-animate'></span>");
	if (current_time_tr != null) {
		stopTimer(current_time_tr);
	}
	tr_map = {};
	$("#time_sheet_table tbody").empty();
	$("#time_sheet_table tbody").append("<tr>" + $template_row.html() + "</tr>");
	loadUserData();
}


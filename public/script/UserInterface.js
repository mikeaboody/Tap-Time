var setupTR = function(tr) {
	tr.$projectJQ().on('change', function() {
   		tr.updateTasks($(this).val());
   		// updateLabel(tr);
	});
	tr.$taskJQ().on('change', function() {
   		updateLabel(tr);
	});
	tr.$taskTypeJQ().on('change', function() {
   		updateLabel(tr);
	});

	tr.$minutesJQ().on('change', function() {
		var minutes = tr.getMinutes();
		var format = minutes < 10 ? "0" + minutes : "" + minutes;
		$(this).val(format);
   		updateLabel(tr);
	});

	tr.$timerButtonJQ().on('click', function() {
		tr.switchTimer();
	});
	tr.$deleteButtonJQ().on('click', function() {
		deleteRow(tr);
	});
}

var updateProject = function(tr) {
	tr.$projectJQ().empty();
	tr.$projectJQ().append("<option value='' disabled selected>Project</option>");
	for (var i = 0; i < tr.currProjects.length; i += 1) {
		var currProj = tr.currProjects[i];
		tr.$projectJQ().append("<option value='" + currProj.id + "'>" + currProj.name  + "</option>");
	}
	setupTR(tr);
	updateLabel(tr);
}

var displayLoadingTasks = function(tr) {
	tr.$taskJQ().empty();
	tr.$taskJQ().append("<option value='' disabled selected>Loading...</option>");
	updateLabel(tr);
}

var updateTasks = function(tr, proj_id) {
	console.log(tr);
	tr.$taskJQ().empty();
	tr.$taskJQ().append("<option value='' disabled selected>Task</option>");

	for (var i = 0; i < tr.currTasks.length; i += 1) {
		var currTask = tr.currTasks[i];
		tr.$taskJQ().append("<option value='" + currTask.id + "'> " + currTask.name  + "</option>");
	}
	updateLabel(tr);
	tr.updateTimeType(proj_id);
}

var updateTimeType = function(tr, proj_id) {
	var success = function(data) {
		tr.currTaskTypes = [];
		tr.$taskTypeJQ().empty();
		tr.$taskTypeJQ().append("<option value='' disabled selected>Billing Type</option>");
		for (var i = 0; i < data.length; i += 1) {
			var currTimeType = new TaskType(data[i].time_type_nm, data[i].time_type_id);
			var includableTimeTypes = ["Billable", "Non-Billable", "Off-Hours Support", "On-Site Support", "Remote Support"];
			if ($.inArray(currTimeType.name, includableTimeTypes) != -1) {
				tr.$taskTypeJQ().append("<option value='" + currTimeType.id + "'> " + currTimeType.name  + "</option>");
				tr.currTaskTypes.push(currTimeType);
			}
		}
		updateLabel(tr);
	}
	tr.$taskTypeJQ().empty();
	tr.$taskTypeJQ().append("<option value='' disabled selected>Loading...</option>");
	updateLabel(tr);
	COMMUNICATOR.getTimeTypes(proj_id, success);
}


var updateLabel = function(tr) {
	$(".welcome").html("Welcome " + master_user.first_name + "!");
	if ($(".content").is(":hidden")) {
		$(".content").show();
	}
	tr.$projectJQ().selectpicker('refresh');
	tr.$taskJQ().selectpicker('refresh');
	tr.$taskTypeJQ().selectpicker('refresh');
}

var switchTimer = function(tr) {
	var updateTimer = function() {
		current_time_tr.time += 1000;
		var hours = Math.floor(current_time_tr.time / (3600*1000));
		var minutes = Math.floor(current_time_tr.time / (60*1000)) % 60;
		var seconds = Math.floor(current_time_tr.time / 1000) % 60;
		var newLabel = ((hours < 10) ? ("0" + hours) : ("" + hours)) + ":"
						+ ((minutes < 10) ? ("0" + minutes) : ("" + minutes)) + ":"
						+ ((seconds < 10) ? ("0" + seconds) : ("" + seconds));
		current_time_tr.$timerLabelJQ().html(newLabel);
	}

	if (tr_timer == null) { //just starting the timer
		startTimer(tr, updateTimer);
	} else { //stopping the timer
		if (current_time_tr == tr) {
			stopTimer(tr);
		} else {
			stopTimer(current_time_tr);
			startTimer(tr, updateTimer);
		}
	}
}

var startTimer = function(tr, action) {
	tr_timer = setInterval(action, 1000);
	current_time_tr = tr;
	current_time_tr.$timerButtonJQ().html("Stop");
	current_time_tr.$timerButtonJQ().toggleClass("btn-danger");
}

var stopTimer = function(tr) {
	clearInterval(tr_timer);
	tr_timer = null;
	current_time_tr = null;
	var hours = Math.floor(tr.time / (3600*1000));
	var minutes = Math.floor(tr.time / (60*1000)) % 60;
	tr.$minutesJQ().val(minutes < 10 ? "0" + minutes : "" + minutes);
	tr.$hoursJQ().val(hours);
	updateLabel(tr);
	tr.$timerButtonJQ().html("Start");
	tr.$timerButtonJQ().toggleClass("btn-danger");
}

var redirectToTimesheet = function() {
	var url = "/display?email=" + master_email;
	window.location.replace(url);
	window.location.href = url;
}

// //allow projects to be sortable

 $(function() {
    $("#time_sheet_table tbody").sortable({
		helper:fixHelper
	}).disableSelection();
 });

// }
var fixHelper = function(e, ui) {
	ui.children().each(function() {
		$(this).width($(this).width());
	});
	return ui;
};



var addRow = function() {
	var id = createTR();
	var myRow = $template_row;
	var myHTML = "<tr id=" + id + ">" + myRow.html() + "</tr>";
	if ($("#time_sheet_table tbody tr:last").index() == -1) {
		$("#time_sheet_table tbody").append(myHTML);
	} else {
		$("#time_sheet_table tbody tr:last").after(myHTML);
	}
    tr_map[id].updateProject();
    // tr_map[id].updateTasks(master_user.projects[0].id);
}

// //delete a row from projects
var deleteRow = function(tr) {
	if (($("#time_sheet_table tbody tr:last").index() + 1) > 1) {
		if (current_time_tr == tr) {
			stopTimer(tr);
		}
		deleteTR(tr);
	} else {
		swal("You must have one or more projects on the timesheet", "", "error");
	}	
}

var timeoutFailure = function() {
	swal({
		title: "Page Timed Out. Please try again later.",
		type: "error"
	});
	$(".welcome").html("Timed out.");
}

var generalFailure = function() {
	swal({
		title: "Something went wrong. Please try again later.",
		type: "error"
	});
	$(".welcome").html("Something went wrong.");
}

var updateCalendar = function() {
	$("#event_table").empty();
	$("#event_table").append("<thead><th>Event</th><th>Time</th></thead>");
	$("#event_table").append("<tbody></tbody>");
	var date_selected = $(".calendar_date .datepicker").datepicker("getDate");
	var empty = true;; 
	for (var i = 0; i < master_user.events.length; i += 1) {
		var curr_event = master_user.events[i];
		if (date_selected.getDate() == curr_event.start.getDate()) {
			empty = false;
			var tr = "<tr>";
			tr += "<td>" + curr_event.name + "</td>";
			var start_hours = curr_event.start.getHours();
			var start_minutes = (curr_event.start.getMinutes() < 10) ? ("0" + curr_event.start.getMinutes()) : ("" + curr_event.start.getMinutes());
			var start_ampm = (start_hours < 12) ? "A.M." : "P.M.";
			start_hours = (start_hours % 12 == 0) ? 12 : start_hours % 12;

			var end_hours = curr_event.end.getHours() + "";
			var end_minutes = (curr_event.end.getMinutes() < 10) ? ("0" + curr_event.end.getMinutes()) : ("" + curr_event.end.getMinutes());
			var end_ampm = (end_hours < 12) ? "A.M." : "P.M.";
			end_hours = (end_hours % 12 == 0) ? 12 : end_hours % 12;

			var time_string = start_hours + ":" + start_minutes + " " + start_ampm + " - " + end_hours + ":" + end_minutes + " " + end_ampm;

			tr += "<td>" + time_string + "</td>";
			tr += "</tr>";
			$("#event_table tbody").append(tr);
		}
	}
	if (empty) {
		$("#event_table").empty();
		$("#event_table").append("<h5>No calendar events.</h5>");
	}
	// if (master_user.events.length == 0) {
	// 	$(".today").append("<h5>No events today on Google Calendar.</h5>");
	// }
}

var dateFormat = function(date) {
	var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
					"October", "November", "December"];
	return days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate();
}

$('.selectpicker').selectpicker();

//intitializes tooltip
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});

$(function() {
	$( ".datepicker" ).datepicker({ 
		minDate: -7, 
		maxDate: "+0M +0D", 
		showOn: "both", 
		defaultDate: +0,
		buttonImageOnly: true, 
		buttonImage: 'jquery-ui-1.11.4.custom/images/ui-icon-calendar.gif',
		dateFormat: 'DD, MM d'
	});
	$(".datepicker").datepicker('setDate', new Date());
});

